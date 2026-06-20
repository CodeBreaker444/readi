import { prisma } from '@/lib/prisma';
import { RepositoryFile } from '@/config/types/evaluation-planning';
import { getPresignedDownloadUrl } from '@/lib/s3Client';

interface EvaluationCreateData {
  client_id: number;
  fk_luc_procedure_id: number;
  evaluation_status: string;
  evaluation_request_date: string;
  evaluation_year: number;
  evaluation_description: string;
  evaluation_offer?: string;
  evaluation_sale_manager?: string;
  areas: Array<{
    type: string;
    area_sqm: number;
    center_lat: number;
    center_lng: number;
    geojson: any;
  }>;
}

async function generateEvaluationCode(ownerId: number, year: number): Promise<string> {
  const prefix = `EVA-${year}-`;

  const data = await prisma.evaluation.findFirst({
    where: { fk_owner_id: ownerId, evaluation_year: year },
    orderBy: { evaluation_code: 'desc' },
    select: { evaluation_code: true },
  });

  let nextNumber = 1;

  if (data?.evaluation_code) {
    const parts = data.evaluation_code.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }

  const seq = nextNumber.toString().padStart(4, '0');
  return `${prefix}${seq}`;
}

export async function createNewEvaluationRequest(
  ownerId: number,
  userId: number,
  data: EvaluationCreateData
) {
  try {
    const evaluationCode = await generateEvaluationCode(ownerId, data.evaluation_year);

    const polygonData = {
      type: 'FeatureCollection' as const,
      features: data.areas.map((area, index) => ({
        type: 'Feature' as const,
        properties: {
          name: `${area.type} ${index + 1}`,
          area_sqm: area.area_sqm,
          center: { lat: area.center_lat, lng: area.center_lng },
        },
        geometry: area.geojson.geometry ?? area.geojson,
      })),
    };

    const totalArea = data.areas.reduce((sum, area) => sum + area.area_sqm, 0);

    const evaluation = await prisma.evaluation.create({
      data: {
        fk_owner_id: ownerId,
        fk_client_id: data.client_id,
        fk_luc_procedure_id: data.fk_luc_procedure_id || null,
        evaluation_code: evaluationCode,
        evaluation_name: `Evaluation ${evaluationCode}`,
        evaluation_description: data.evaluation_description,
        evaluation_type: 'General',
        evaluation_status: data.evaluation_status,
        evaluation_year: data.evaluation_year,
        scheduled_date: data.evaluation_request_date ? new Date(data.evaluation_request_date) : null,
        created_by_user_id: userId,
        evaluation_active: 'Y',
        evaluation_result: 'PROCESSING',
        evaluation_metadata: {
          polygon: polygonData,
          area_sqm: totalArea,
          procedure_id: data.fk_luc_procedure_id,
          year: data.evaluation_year,
          offer: data.evaluation_offer ?? '',
          sale_manager: data.evaluation_sale_manager ?? '',
        },
      },
      select: { evaluation_id: true, evaluation_code: true },
    });

    return {
      success: true,
      evaluation_id: evaluation.evaluation_id,
      evaluation_code: evaluation.evaluation_code,
      message: 'Evaluation created successfully',
    };
  } catch (error) {
    console.error('createNewEvaluationRequest error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create evaluation'
    );
  }
}

export async function getEvaluationFileList(evaluationId: number, ownerId: number) {
  try {
    const evalCheck = await prisma.evaluation.findFirst({
      where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
      select: { evaluation_id: true },
    });

    if (!evalCheck) throw new Error('Evaluation not found');

    const data = await prisma.evaluation_file.findMany({
      where: { fk_evaluation_id: evaluationId },
      orderBy: { uploaded_at: 'desc' },
    });

    return {
      success: true,
      files: data.map(file => ({
        id: file.file_id,
        filename: file.file_name,
        description: file.file_description,
        version: file.file_version,
        upload_date: file.uploaded_at,
        folder: file.file_path,
      })),
    };
  } catch (error) {
    console.error('Error fetching files:', error);
    throw new Error('Failed to fetch evaluation files');
  }
}

export async function getMissionPlanningLogbookFiles(
  ownerId: number,
  planningId?: number
): Promise<RepositoryFile[]> {
  const data = await prisma.planning_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      mission_planning_s3_key: { not: null },
      NOT: { mission_planning_s3_key: '' },
      ...(planningId && { fk_planning_id: planningId }),
    },
    orderBy: { created_at: 'desc' },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_desc: true,
      mission_planning_filename: true,
      mission_planning_filesize: true,
      mission_planning_s3_key: true,
      mission_planning_s3_url: true,
      created_at: true,
    },
  });

  const files: RepositoryFile[] = [];
  for (const row of data) {
    let documentUrl = row.mission_planning_s3_url ?? '#';

    if (row.mission_planning_s3_key) {
      try {
        documentUrl = await getPresignedDownloadUrl(row.mission_planning_s3_key, 900);
      } catch {
        documentUrl = row.mission_planning_s3_url ?? '#';
      }
    }

    files.push({
      file_id: row.mission_planning_id,
      repository_filename: row.mission_planning_filename ?? '',
      repository_filename_description: `${row.mission_planning_code ?? ''} — ${row.mission_planning_desc ?? ''}`,
      repository_filesize: row.mission_planning_filesize
        ? `${(Number(row.mission_planning_filesize) / 1024).toFixed(1)} KB`
        : '',
      repository_folder: row.mission_planning_s3_key ?? '',
      document_url: documentUrl,
      s3_url: row.mission_planning_s3_url ?? '',
      last_update: row.created_at?.toISOString() ?? '',
    });
  }

  return files;
}
