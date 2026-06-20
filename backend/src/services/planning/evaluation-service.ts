import { prisma } from '@/lib/prisma';
import { Client, Evaluation, EvaluationFile, LucProcedure } from '@/config/types/evaluation';
import { deleteFileFromS3 } from '@/lib/s3Client';

export async function getEvaluationList(ownerId: number): Promise<Evaluation[]> {
  const data = await prisma.evaluation.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { evaluation_id: 'desc' },
    include: {
      client: { select: { client_name: true } },
      luc_procedure: { select: { procedure_code: true, procedure_version: true } },
      users: { select: { username: true } },
    },
  });

  return data.map((row) => {
    const metadata =
      typeof row.evaluation_metadata === 'string'
        ? JSON.parse(row.evaluation_metadata)
        : (row.evaluation_metadata as Record<string, any>) ?? {};

    return {
      ...row,
      client_name: row.client?.client_name ?? '',
      luc_procedure_code: row.luc_procedure?.procedure_code ?? '',
      luc_procedure_ver: row.luc_procedure?.procedure_version ?? '',
      user_name: row.users?.username ?? '',
      evaluation_desc: row.evaluation_description ?? '',
      evaluation_request_date: row.scheduled_date ?? '',
      last_update: row.updated_at ?? '',
      evaluation_offer: metadata.offer ?? '',
      evaluation_sale_manager: metadata.sale_manager ?? '',
    };
  }) as unknown as Evaluation[];
}

export async function deleteEvaluation(
  evaluationId: number,
  ownerId: number
): Promise<void> {
  const existing = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_status: true },
  });

  if (!existing) throw new Error('Evaluation not found');
  if (existing.evaluation_status !== 'NEW') {
    throw new Error('Only evaluations with status NEW can be deleted');
  }

  await prisma.evaluation.deleteMany({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
  });
}

export async function getEvaluationFiles(
  evaluationId: number,
  ownerId: number
): Promise<EvaluationFile[]> {
  const evalCheck = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalCheck) throw new Error('Evaluation not found');

  const data = await prisma.evaluation_file.findMany({
    where: { fk_evaluation_id: evaluationId },
    orderBy: { file_id: 'desc' },
  });

  return data as unknown as EvaluationFile[];
}

export async function addEvaluationFile(payload: {
  fk_owner_id: number;
  fk_user_id: number;
  fk_client_id: number;
  fk_evaluation_id: number;
  evaluation_file_desc: string;
  evaluation_file_folder: string;
  evaluation_file_filename: string;
  evaluation_file_filesize: number;
  evaluation_file_ver: string;
}): Promise<EvaluationFile> {
  const data = await prisma.evaluation_file.create({
    data: {
      fk_evaluation_id: payload.fk_evaluation_id,
      file_name: payload.evaluation_file_filename,
      file_path: payload.evaluation_file_folder,
      file_description: payload.evaluation_file_desc,
      file_size: BigInt(payload.evaluation_file_filesize),
      file_version: parseInt(payload.evaluation_file_ver) || 1,
      uploaded_by_user_id: payload.fk_user_id,
      file_category: 'Upload',
      is_latest: true,
      uploaded_at: new Date(),
    },
  });

  return data as unknown as EvaluationFile;
}

export async function deleteEvaluationFile(
  fileId: number,
  ownerId: number
): Promise<{ file_folder: string }> {
  const existing = await prisma.evaluation_file.findUnique({
    where: { file_id: fileId },
    select: { file_path: true, fk_evaluation_id: true },
  });

  if (!existing) throw new Error('File not found');

  const evalCheck = await prisma.evaluation.findFirst({
    where: { evaluation_id: existing.fk_evaluation_id, fk_owner_id: ownerId },
    select: { evaluation_id: true },
  });

  if (!evalCheck) throw new Error('Access denied');

  await prisma.evaluation_file.delete({ where: { file_id: fileId } });

  return { file_folder: existing.file_path ?? '' };
}

export async function getClientList(ownerId: number): Promise<Client[]> {
  const data = await prisma.client.findMany({
    where: { fk_owner_id: ownerId, client_active: 'Y' },
    orderBy: { client_name: 'asc' },
    select: { client_id: true, client_name: true, client_code: true },
  });

  return data as unknown as Client[];
}

export async function getLucProcedureList(
  ownerId: number,
  sector?: string
): Promise<LucProcedure[]> {
  const data = await prisma.luc_procedure.findMany({
    where: {
      fk_owner_id: ownerId,
      procedure_active: 'Y',
      ...(sector && { procedure_status: sector }),
    },
    orderBy: { procedure_code: 'asc' },
    select: {
      procedure_id: true,
      procedure_code: true,
      procedure_name: true,
      procedure_version: true,
      procedure_status: true,
    },
  });

  return data.map((row) => ({
    luc_procedure_id: row.procedure_id,
    luc_procedure_desc: row.procedure_name,
    luc_procedure_code: row.procedure_code ?? '',
    luc_procedure_ver: row.procedure_version ?? '1.0',
    luc_procedure_sector: row.procedure_status ?? '',
  })) as LucProcedure[];
}

export async function deleteLogbookFile(
  missionPlanningId: number,
  s3Key: string
) {
  if (s3Key) {
    try {
      await deleteFileFromS3(s3Key);
    } catch (err) {
      console.error('S3 delete failed:', err);
    }
  }

  await prisma.planning_logbook.updateMany({
    where: { mission_planning_id: missionPlanningId },
    data: {
      mission_planning_filename: null,
      mission_planning_filesize: null,
      mission_planning_folder: null,
      mission_planning_s3_key: null,
      mission_planning_s3_url: null,
    },
  });

  return { success: true };
}
