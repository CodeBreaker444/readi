import { prisma } from '@/lib/prisma';
import { EvaluationTask } from '@/config/types/evaluation';
import { DroneTool, FileType, MissionTemplate, PilotUser, PlanningLogbookRow, PlanningTestLogbookRow, RepositoryFile } from '@/config/types/evaluation-planning';
import { ProcedureSteps } from '@/config/types/lcuProcedures';
import { deleteFileFromS3, getPresignedDownloadUrl } from '@/lib/s3Client';

export type UpdatePlanning = {
  planning_id: number;
  fk_evaluation_id: number;
  fk_client_id?: number;
  planning_desc: string;
  planning_status: string;
  planning_request_date: string;
  planning_type: string;
  planning_active?: string;
};

type CreatePlanningInput = {
  fk_evaluation_id: number;
  fk_client_id?: number;
  fk_luc_procedure_id: number;
  planning_desc: string;
  planning_status: 'NEW' | 'PROCESSING' | 'REQ_FEEDBACK' | 'POSITIVE_RESULT' | 'NEGATIVE_RESULT';
  planning_request_date: string;
  planning_year: number;
  planning_type?: string;
  planning_folder?: string;
  planning_result?: string;
  assigned_by_user_id?: number;
  assigned_to_user_id?: number;
};


export async function addPlanningWithAssignment(
  input: CreatePlanningInput,
  userId: number,
  ownerId: number
) {
  const inserted = await prisma.planning.create({
    data: {
      fk_owner_id: ownerId,
      created_by_user_id: userId,
      fk_client_id: input.fk_client_id ?? null,
      fk_evaluation_id: input.fk_evaluation_id,
      planning_description: input.planning_desc,
      planning_name: input.planning_desc,
      planning_status: input.planning_status,
      planning_type: input.planning_type ?? '',
      planned_date: input.planning_request_date ? new Date(input.planning_request_date) : null,
      assigned_to_user_id: input.assigned_to_user_id ?? null,
    },
    select: { planning_id: true, created_by_user_id: true, assigned_to_user_id: true },
  });

  return {
    planning_id: inserted.planning_id,
    assigned_by_user_id: userId,
    assigned_to_user_id: inserted.assigned_to_user_id ?? null,
  };
}

export async function getPlanningList(ownerId: number) {
  const data = await prisma.planning.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { planning_id: 'desc' },
    select: {
      planning_id: true,
      fk_owner_id: true,
      fk_client_id: true,
      fk_evaluation_id: true,
      planning_code: true,
      planning_name: true,
      planning_description: true,
      planning_type: true,
      planning_status: true,
      planned_date: true,
      planning_active: true,
      created_at: true,
      updated_at: true,
      created_by_user_id: true,
      assigned_to_user_id: true,
      client: { select: { client_id: true, client_name: true } },
      evaluation: { select: { evaluation_id: true, evaluation_code: true, evaluation_metadata: true } },
      users_planning_created_by_user_idTousers: { select: { user_id: true, first_name: true, last_name: true, user_role: true } },
      users_planning_assigned_to_user_idTousers: { select: { user_id: true, first_name: true, last_name: true, user_role: true } },
    },
  });

  const mapped = data.map((row) => {
    const client = row.client;
    const evaluation = row.evaluation;
    const createdByUser = row.users_planning_created_by_user_idTousers;
    const assignedToUser = row.users_planning_assigned_to_user_idTousers;

    let procedureId: number | null = null;
    const evalMeta = evaluation?.evaluation_metadata;
    if (evalMeta) {
      try {
        const meta = typeof evalMeta === 'string' ? JSON.parse(evalMeta) : evalMeta;
        procedureId = (meta as any).procedure_id ?? null;
      } catch { /* ignore */ }
    }

    return {
      planning_id: row.planning_id,
      fk_owner_id: row.fk_owner_id,
      fk_client_id: client?.client_id ?? row.fk_client_id ?? null,
      fk_evaluation_id: evaluation?.evaluation_id ?? 0,
      assigned_to_user_id: row.assigned_to_user_id ?? null,
      planning_code: row.planning_code ?? '',
      planning_name: row.planning_name ?? '',
      planning_desc: row.planning_description ?? '',
      planning_status: row.planning_status ?? '',
      planning_type: row.planning_type ?? '',
      planning_request_date: row.planned_date?.toISOString().split('T')[0] ?? '',
      planning_year: new Date().getFullYear(),
      planning_ver: '1.0',
      planning_folder: '',
      planning_result: 'PROGRESS',
      planning_active: row.planning_active ?? 'Y',
      last_update: row.updated_at?.toISOString() ?? row.created_at?.toISOString() ?? '',
      client_name: client?.client_name ?? '',
      user_fullname: createdByUser
        ? `${createdByUser.first_name ?? ''} ${createdByUser.last_name ?? ''}`.trim()
        : '',
      user_profile_code: createdByUser?.user_role ?? '',
      pic_data: assignedToUser
        ? {
          fullname: `${assignedToUser.first_name ?? ''} ${assignedToUser.last_name ?? ''}`.trim(),
          user_profile_code: assignedToUser.user_role ?? '',
        }
        : null,
      luc_procedure_code: '',
      luc_procedure_ver: '',
      _procedure_id: procedureId,
    };
  });

  const procedureIds = [...new Set(mapped.map((m) => m._procedure_id).filter(Boolean))] as number[];

  if (procedureIds.length > 0) {
    const procedures = await prisma.luc_procedure.findMany({
      where: { procedure_id: { in: procedureIds } },
      select: { procedure_id: true, procedure_code: true, procedure_version: true },
    });

    const procMap = new Map(
      procedures.map((p) => [p.procedure_id, { code: p.procedure_code ?? '', ver: p.procedure_version ?? '' }])
    );

    for (const row of mapped) {
      if (row._procedure_id && procMap.has(row._procedure_id)) {
        const proc = procMap.get(row._procedure_id)!;
        row.luc_procedure_code = proc.code;
        row.luc_procedure_ver = proc.ver;
      }
    }
  }

  const cleaned = mapped.map(({ _procedure_id, ...rest }) => rest);
  return { data: cleaned, dataRows: cleaned.length };
}

export async function getPlanningData(ownerId: number, planningId: number) {
  const data = await prisma.planning.findFirst({
    where: { fk_owner_id: ownerId, planning_id: planningId },
    select: {
      planning_id: true,
      fk_owner_id: true,
      fk_client_id: true,
      fk_evaluation_id: true,
      planning_code: true,
      planning_name: true,
      planning_description: true,
      planning_type: true,
      planning_status: true,
      planned_date: true,
      planning_active: true,
      assigned_to_user_id: true,
      created_at: true,
      updated_at: true,
      client: { select: { client_id: true, client_name: true } },
      evaluation: { select: { evaluation_id: true, evaluation_metadata: true } },
      users_planning_created_by_user_idTousers: { select: { user_id: true, first_name: true, last_name: true, user_role: true } },
      users_planning_assigned_to_user_idTousers: { select: { user_id: true, first_name: true, last_name: true, user_role: true } },
    },
  });

  if (!data) throw new Error('Planning not found');

  const client = data.client;
  const evaluation = data.evaluation;
  const assignedToUser = data.users_planning_assigned_to_user_idTousers;

  let lucCode = '';
  let lucVer = '';
  const evalMeta = evaluation?.evaluation_metadata;
  if (evalMeta) {
    try {
      const meta = typeof evalMeta === 'string' ? JSON.parse(evalMeta) : evalMeta;
      if ((meta as any).procedure_id) {
        const proc = await prisma.luc_procedure.findUnique({
          where: { procedure_id: (meta as any).procedure_id },
          select: { procedure_code: true, procedure_version: true },
        });
        if (proc) {
          lucCode = proc.procedure_code ?? '';
          lucVer = proc.procedure_version ?? '';
        }
      }
    } catch { /* ignore */ }
  }

  return {
    planning_id: data.planning_id,
    fk_owner_id: data.fk_owner_id,
    fk_client_id: client?.client_id ?? data.fk_client_id ?? 0,
    fk_evaluation_id: evaluation?.evaluation_id ?? 0,
    assigned_to_user_id: data.assigned_to_user_id ?? null,
    planning_code: data.planning_code ?? '',
    planning_desc: data.planning_description ?? '',
    planning_status: data.planning_status ?? '',
    planning_type: data.planning_type ?? '',
    planning_request_date: data.planned_date?.toISOString().split('T')[0] ?? '',
    planning_active: data.planning_active ?? 'Y',
    last_update: data.updated_at?.toISOString() ?? '',
    client_name: client?.client_name ?? '',
    luc_procedure_code: lucCode,
    luc_procedure_ver: lucVer,
    pic_data: assignedToUser
      ? {
        fullname: `${assignedToUser.first_name ?? ''} ${assignedToUser.last_name ?? ''}`.trim(),
        user_profile_code: assignedToUser.user_role ?? '',
      }
      : null,
  };
}

export async function updatePlanning(payload: UpdatePlanning, ownerId: number) {
  const { planning_id, ...updates } = payload;

  const updateObj: Record<string, unknown> = {
    planning_description: updates.planning_desc,
    planning_name: updates.planning_desc,
    planning_status: updates.planning_status,
    planning_type: updates.planning_type ?? null,
    planned_date: updates.planning_request_date ? new Date(updates.planning_request_date) : null,
  };

  if (updates.planning_active !== undefined) updateObj.planning_active = updates.planning_active;
  if (updates.fk_evaluation_id !== undefined) updateObj.fk_evaluation_id = updates.fk_evaluation_id;
  if (updates.fk_client_id !== undefined) updateObj.fk_client_id = updates.fk_client_id;

  const result = await prisma.planning.updateMany({
    where: { planning_id, fk_owner_id: ownerId },
    data: updateObj,
  });

  if (result.count === 0) throw new Error('Planning not found or access denied');

  return prisma.planning.findUnique({ where: { planning_id } });
}

export async function deletePlanning(ownerId: number, planningId: number) {
  const existing = await prisma.planning.findFirst({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    select: { planning_status: true },
  });

  if (!existing) throw new Error('Planning not found');
  if (existing.planning_status !== 'NEW') {
    throw new Error('Only planning with status NEW can be deleted');
  }

  await prisma.planning.deleteMany({ where: { fk_owner_id: ownerId, planning_id: planningId } });

  return { deleted: true };
}

export async function getPlanningLogbookList(
  ownerId: number,
  planningId: number
): Promise<PlanningLogbookRow[]> {
  const data = await prisma.planning_logbook.findMany({
    where: { fk_planning_id: planningId, fk_owner_id: ownerId },
    orderBy: { mission_planning_id: 'asc' },
    include: {
      planning: { select: { planning_description: true } },
      tool: { select: { tool_code: true, tool_description: true } },
    },
  });

  if (!data || data.length === 0) return [];

  const testCounts = await prisma.planning_test_logbook.count({
    where: { fk_planning_id: planningId },
  });

  return data.map((row) => ({
    mission_planning_id: row.mission_planning_id,
    fk_planning_id: row.fk_planning_id,
    fk_evaluation_id: row.fk_evaluation_id,
    fk_client_id: row.fk_client_id,
    fk_tool_id: row.fk_tool_id,
    mission_planning_code: row.mission_planning_code ?? '',
    mission_planning_desc: row.mission_planning_desc ?? '',
    mission_planning_limit_json: row.mission_planning_limit_json,
    mission_planning_active: row.mission_planning_active ?? 'Y',
    mission_planning_ver: row.mission_planning_ver ?? '',
    mission_planning_filename: row.mission_planning_filename ?? '',
    mission_planning_filesize: Number(row.mission_planning_filesize ?? 0),
    planning_desc: row.planning?.planning_description ?? '',
    tool_code: row.tool?.tool_code ?? '',
    tool_desc: row.tool?.tool_description ?? '',
    tot_test: testCounts,
  })) as PlanningLogbookRow[];
}

export async function getPlanningTestLogbookList(
  ownerId: number,
  missionPlanningId: number
): Promise<PlanningTestLogbookRow[]> {
  const data = await prisma.planning_test_logbook.findMany({
    where: { fk_planning_id: missionPlanningId },
    orderBy: { test_id: 'asc' },
  });

  if (!data) return [];
  return data as unknown as PlanningTestLogbookRow[];
}

export async function addMissionPlanningLogbook(params: {
  fk_planning_id: number;
  fk_evaluation_id: number;
  fk_client_id: number;
  fk_owner_id: number;
  fk_user_id: number;
  mission_planning_code: string;
  mission_planning_desc: string;
  mission_planning_limit_json: Record<string, unknown> | null;
  mission_planning_active: string;
  mission_planning_ver: string;
  fk_tool_id: number | null;
  mission_planning_filename: string;
  mission_planning_filesize: number;
  mission_planning_folder: string;
  mission_planning_s3_key: string;
  mission_planning_s3_url: string;
}) {
  const data = await prisma.planning_logbook.create({
    data: {
      fk_planning_id: params.fk_planning_id,
      fk_evaluation_id: params.fk_evaluation_id,
      fk_client_id: params.fk_client_id,
      fk_owner_id: params.fk_owner_id,
      fk_user_id: params.fk_user_id,
      mission_planning_code: params.mission_planning_code,
      mission_planning_desc: params.mission_planning_desc,
      mission_planning_limit_json: (params.mission_planning_limit_json ?? undefined) as any,
      mission_planning_active: params.mission_planning_active,
      mission_planning_ver: parseInt(params.mission_planning_ver) || 1,
      fk_tool_id: params.fk_tool_id,
      mission_planning_filename: params.mission_planning_filename,
      mission_planning_filesize: BigInt(params.mission_planning_filesize),
      mission_planning_folder: params.mission_planning_folder,
      mission_planning_s3_key: params.mission_planning_s3_key,
      mission_planning_s3_url: params.mission_planning_s3_url,
    },
    select: { mission_planning_id: true },
  });

  return data;
}

export async function deleteMissionPlanningLogbook(
  ownerId: number,
  missionPlanningId: number
): Promise<{ deletedId: number; hadTestEntries: boolean }> {
  const existing = await prisma.planning_logbook.findFirst({
    where: { mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    select: { mission_planning_id: true, mission_planning_code: true, mission_planning_folder: true },
  });

  if (!existing) {
    throw new Error('Mission planning logbook entry not found or access denied');
  }

  const relatedTests = await prisma.planning_test_logbook.findMany({
    where: { fk_mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    select: { test_id: true, mission_test_s3_key: true },
  });

  const hadTestEntries = relatedTests.length > 0;

  if (hadTestEntries) {
    for (const test of relatedTests) {
      if (test.mission_test_s3_key) {
        try {
          await deleteFileFromS3(test.mission_test_s3_key);
        } catch (s3Err) {
          console.error(`Failed to delete S3 file for test ${test.test_id}:`, s3Err);
        }
      }
    }

    await prisma.planning_test_logbook.deleteMany({
      where: { fk_mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
    });
  }

  await prisma.planning_logbook.deleteMany({
    where: { mission_planning_id: missionPlanningId, fk_owner_id: ownerId },
  });

  return { deletedId: missionPlanningId, hadTestEntries };
}

export async function getRepositoryList(
  ownerId: number,
  repositoryType: string,
  planningId?: number
): Promise<RepositoryFile[]> {
  const data = await prisma.repository_file.findMany({
    where: {
      fk_owner_id: ownerId,
      file_category: repositoryType,
      ...(planningId && { file_metadata: { path: ['planning_id'], equals: planningId } }),
    },
    orderBy: { file_id: 'desc' },
  });

  if (!data) return [];
  return data as unknown as RepositoryFile[];
}

export async function createCommunication(params: {
  fk_owner_id: number;
  client_id: number;
  planning_id: number;
  evaluation_id: number;
  pic_id: number;
}) {
  const data = await prisma.communication_general.create({
    data: {
      fk_owner_id: params.fk_owner_id,
      subject: 'Planning Communication',
      message: `New communication for planning ${params.planning_id}`,
      communication_type: 'planning',
      status: 'NEW',
      recipients: JSON.stringify({
        client_id: params.client_id,
        planning_id: params.planning_id,
        evaluation_id: params.evaluation_id,
        pic_id: params.pic_id,
      }),
    },
    select: { communication_id: true },
  });

  return data;
}

export async function getDroneToolList(
  ownerId: number,
  clientId: number,
  active: string = 'ALL',
  status: string = 'ALL'
): Promise<DroneTool[]> {
  const data = await prisma.tool.findMany({
    where: {
      fk_owner_id: ownerId,
      ...(active !== 'ALL' && { tool_active: active }),
    },
    orderBy: { tool_id: 'asc' },
    include: {
      tool_model: { select: { model_id: true, model_code: true, model_name: true, manufacturer: true } },
      tool_status: { select: { status_code: true, status_name: true } },
    },
  });

  if (!data) return [];

  return data.map((row) => ({
    tool_id: row.tool_id,
    tool_code: row.tool_code ?? '',
    tool_desc: row.tool_description ?? row.tool_name ?? '',
    tool_status: row.tool_status?.status_name ?? '',
    tool_active: row.tool_active ?? 'N',
    fk_owner_id: row.fk_owner_id,
    fk_model_id: row.fk_model_id,
    factory_type: row.tool_model?.manufacturer ?? '',
    factory_serie: row.tool_model?.model_code ?? '',
    factory_model: row.tool_model?.model_name ?? '',
  })) as DroneTool[];
}

export async function getPilotList(ownerId: number): Promise<PilotUser[]> {
  const data = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_role: 'PIC' },
    orderBy: { last_name: 'asc' },
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
      user_role: true,
      user_active: true,
    },
  });

  if (!data) return [];

  return data.map((row) => ({
    user_id: row.user_id,
    fullname: `${row.first_name} ${row.last_name}`,
    username: undefined,
    email: row.email,
    pilot_status_desc: row.user_role,
    userActive: row.user_active,
  })) as unknown as PilotUser[];
}

export async function getMissionTemplateList(ownerId: number): Promise<MissionTemplate[]> {
  const data = await prisma.planning_logbook.findMany({
    where: { fk_owner_id: ownerId, mission_planning_active: 'Y' },
    orderBy: { mission_planning_id: 'asc' },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_desc: true,
      mission_planning_active: true,
    },
  });

  if (!data) return [];
  return data as unknown as MissionTemplate[];
}

export async function getMissionTestRepositoryFiles(
  ownerId: number,
  planningId: number
) {
  const data = await prisma.planning_test_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_planning_id: planningId,
      mission_test_s3_key: { not: null },
    },
    orderBy: { created_at: 'desc' },
    select: {
      test_id: true,
      test_code: true,
      mission_test_filename: true,
      mission_test_filesize: true,
      mission_test_s3_key: true,
      mission_test_result: true,
      created_at: true,
    },
  });

  const files = [];
  for (const row of data ?? []) {
    let documentUrl = '#';
    if (row.mission_test_s3_key) {
      try {
        documentUrl = await getPresignedDownloadUrl(row.mission_test_s3_key, 900);
      } catch {
        documentUrl = '#';
      }
    }

    files.push({
      file_id: row.test_id,
      repository_filename: row.mission_test_filename ?? '',
      repository_filename_description: `Test ${row.test_code ?? ''} — ${row.mission_test_result === 'success' ? 'Positive' : 'Negative'}`,
      repository_filesize: row.mission_test_filesize ? `${row.mission_test_filesize} MB` : '',
      document_url: documentUrl,
      last_update: row.created_at?.toISOString() ?? '',
    });
  }

  return files;
}

export async function deleteRepositoryFile(
  fileId: number,
  fileType: FileType,
  s3Key: string | null,
  ownerId: number
) {
  if (s3Key) {
    try {
      await deleteFileFromS3(s3Key);
    } catch (err) {
      console.error(`S3 delete failed for key ${s3Key}:`, err);
    }
  }

  if (fileType === 'mission_planning_logbook') {
    await prisma.planning_logbook.updateMany({
      where: { mission_planning_id: fileId, fk_owner_id: ownerId },
      data: {
        mission_planning_filename: null,
        mission_planning_filesize: null,
        mission_planning_folder: null,
        mission_planning_s3_key: null,
        mission_planning_s3_url: null,
      },
    });
  } else if (fileType === 'mission_planning_test_logbook') {
    await prisma.planning_test_logbook.updateMany({
      where: { test_id: fileId, fk_owner_id: ownerId },
      data: {
        mission_test_filename: null,
        mission_test_filesize: null,
        mission_test_s3_key: null,
      },
    });
  }

  return { success: true };
}

export async function addCommunicationGeneral(params: {
  fk_owner_id: number;
  subject: string;
  message: string;
  communication_type: string;
  communication_level: string;
  priority: string;
  status: string;
  sent_by_user_id: number;
  recipients: number[];
  fk_client_id: number | null;
  fk_planning_id: number | null;
  fk_evaluation_id: number | null;
  communication_to: number[];
  communication_file_name: string | null;
  communication_file_key: string | null;
  communication_file_url: string | null;
}): Promise<number> {
  const data = await prisma.communication_general.create({
    data: {
      fk_owner_id: params.fk_owner_id,
      subject: params.subject,
      message: params.message,
      communication_type: params.communication_type,
      communication_level: params.communication_level,
      priority: params.priority,
      status: params.status,
      sent_by_user_id: params.sent_by_user_id,
      recipients: params.recipients,
      fk_client_id: params.fk_client_id,
      fk_planning_id: params.fk_planning_id,
      fk_evaluation_id: params.fk_evaluation_id,
      communication_to: params.communication_to,
      communication_file_name: params.communication_file_name,
      communication_file_key: params.communication_file_key,
      communication_file_url: params.communication_file_url,
    },
    select: { communication_id: true },
  });

  return data.communication_id;
}

export async function getUsers(params: {
  fk_owner_id: number;
}): Promise<{ user_id: number; first_name: string; last_name: string; email: string; user_role: string }[]> {
  const data = await prisma.public_users.findMany({
    where: { fk_owner_id: params.fk_owner_id, user_active: 'Y' },
    select: { user_id: true, first_name: true, last_name: true, email: true, user_role: true },
  });

  return data.map((u) => ({
    user_id: u.user_id,
    first_name: u.first_name ?? '',
    last_name: u.last_name ?? '',
    email: u.email ?? '',
    user_role: u.user_role ?? '',
  }));
}

export async function getCommunicationsByPlanning(
  ownerId: number,
  planningId: number
) {
  const data = await prisma.communication_general.findMany({
    where: { fk_owner_id: ownerId, fk_planning_id: planningId },
    orderBy: { sent_at: 'desc' },
    select: {
      communication_id: true,
      subject: true,
      message: true,
      communication_type: true,
      communication_level: true,
      priority: true,
      status: true,
      sent_by_user_id: true,
      recipients: true,
      communication_to: true,
      fk_client_id: true,
      fk_planning_id: true,
      fk_evaluation_id: true,
      communication_file_name: true,
      communication_file_key: true,
      communication_file_url: true,
      sent_at: true,
      read_at: true,
      users: { select: { user_id: true, first_name: true, last_name: true } },
    },
  });

  return data.map((row) => ({
    communication_id: row.communication_id,
    subject: row.subject ?? '',
    message: row.message ?? '',
    communication_type: row.communication_type ?? '',
    communication_level: row.communication_level ?? 'info',
    priority: row.priority ?? 'normal',
    status: row.status ?? 'sent',
    sent_by_user_id: row.sent_by_user_id,
    sender_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim()
      : '',
    recipients: row.recipients ?? [],
    communication_to: row.communication_to ?? [],
    fk_client_id: row.fk_client_id,
    fk_planning_id: row.fk_planning_id,
    fk_evaluation_id: row.fk_evaluation_id,
    communication_file_name: row.communication_file_name,
    communication_file_key: row.communication_file_key,
    communication_file_url: row.communication_file_url,
    sent_at: row.sent_at?.toISOString() ?? '',
    read_at: row.read_at?.toISOString() ?? null,
  }));
}

export async function getChecklistList(
  ownerId: number
): Promise<{ checklist_id: number; checklist_code: string; checklist_desc: string }[]> {
  const data = await prisma.checklist.findMany({
    where: { fk_owner_id: ownerId, checklist_active: 'Y' },
    orderBy: { checklist_code: 'asc' },
    select: { checklist_id: true, checklist_code: true, checklist_desc: true },
  });

  return data.map((row) => ({
    checklist_id: row.checklist_id,
    checklist_code: row.checklist_code ?? '',
    checklist_desc: row.checklist_desc ?? '',
  }));
}

export async function addChecklistTaskToPlanning(
  ownerId: number,
  planningId: number,
  checklistId: number,
  taskTitle: string,
  taskDescription: string
) {
  const planning = await prisma.planning.findFirst({
    where: { fk_owner_id: ownerId, planning_id: planningId },
    select: { planning_id: true, planning_json: true },
  });

  if (!planning) throw new Error('Planning not found');

  let planningJson: any;
  const raw = planning.planning_json;
  if (raw) {
    try {
      planningJson = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      planningJson = { tasks: [] };
    }
  } else {
    planningJson = { tasks: [] };
  }

  if (!Array.isArray(planningJson.tasks)) {
    planningJson.tasks = [];
  }

  const checklist = await prisma.checklist.findFirst({
    where: { checklist_id: checklistId, fk_owner_id: ownerId },
    select: { checklist_id: true, checklist_code: true, checklist_desc: true },
  });

  if (!checklist) throw new Error('Checklist not found');

  const existingIds = planningJson.tasks
    .map((t: any) => Number(t?.task_id ?? t?.id ?? 0))
    .filter((n: number) => !isNaN(n));
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  const newTask = {
    task_id: nextId,
    title: taskTitle,
    task_title: taskTitle,
    name: taskTitle,
    description: taskDescription,
    task_completed: false,
    completed: false,
    checklist: [
      {
        checklist_id: checklist.checklist_id,
        checklist_code: checklist.checklist_code ?? '',
        checklist_name: checklist.checklist_desc ?? '',
        checklist_completed: false,
        completed: false,
      },
    ],
  };

  planningJson.tasks.push(newTask);

  await prisma.planning.updateMany({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    data: { planning_json: planningJson },
  });

  return { task_id: nextId, checklist_id: checklistId };
}

export async function movePlanningToTesting(ownerId: number, planningId: number) {
  const existing = await prisma.planning.findFirst({
    where: { fk_owner_id: ownerId, planning_id: planningId },
    select: { planning_id: true, planning_status: true },
  });

  if (!existing) {
    throw new Error('Planning not found or access denied');
  }

  if (existing.planning_status === 'TESTING') {
    throw new Error('Planning is already in TESTING status');
  }

  await prisma.planning.updateMany({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    data: { planning_status: 'TESTING' },
  });

  return { moved: true, planning_id: planningId };
}

async function fetchChecklistJsonMap(
  ownerId: number,
  codes: string[]
): Promise<Map<string, object>> {
  const map = new Map<string, object>();
  if (codes.length === 0) return map;

  const data = await prisma.checklist.findMany({
    where: { fk_owner_id: ownerId, checklist_code: { in: codes } },
    select: { checklist_code: true, checklist_json: true },
  });

  for (const row of data) {
    if (!row.checklist_code) continue;
    const json =
      typeof row.checklist_json === 'string'
        ? JSON.parse(row.checklist_json)
        : row.checklist_json;
    if (json) map.set(row.checklist_code, json as object);
  }

  return map;
}

type StoredTask = Omit<EvaluationTask, 'checklist_json'>;

export async function getPlanningTasks(
  ownerId: number,
  planningId: number
): Promise<{ tasks: EvaluationTask[]; allCompleted: boolean }> {
  const planningBase = await prisma.planning.findFirst({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    select: { planning_id: true, fk_evaluation_id: true, planning_json: true },
  });

  if (!planningBase) throw new Error('Planning not found or access denied');

  let planningJson: Record<string, any> = {};
  const raw = planningBase.planning_json;
  if (raw) {
    planningJson = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, any>);
  }

  if (Array.isArray(planningJson.procedure_tasks) && planningJson.procedure_tasks.length > 0) {
    const stored = planningJson.procedure_tasks as StoredTask[];
    const checklistCodes = stored.filter((t) => t.task_type === 'checklist').map((t) => t.task_code);
    const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);

    const tasks: EvaluationTask[] = stored.map((t) => ({
      ...t,
      checklist_json: t.task_type === 'checklist' ? (checklistJsonMap.get(t.task_code) ?? null) : null,
    }));

    const allCompleted =
      tasks.length > 0 &&
      tasks.every((t) => t.task_status === 'completed' || t.task_status === 'skipped');

    return { tasks, allCompleted };
  }

  const evaluationId = planningBase.fk_evaluation_id;
  if (!evaluationId) return { tasks: [], allCompleted: false };

  const evaluation = await prisma.evaluation.findFirst({
    where: { evaluation_id: evaluationId, fk_owner_id: ownerId },
    select: { fk_luc_procedure_id: true, evaluation_metadata: true },
  });

  let procedureId: number | null = evaluation?.fk_luc_procedure_id ?? null;
  if (!procedureId && evaluation?.evaluation_metadata) {
    const meta =
      typeof evaluation.evaluation_metadata === 'string'
        ? JSON.parse(evaluation.evaluation_metadata)
        : evaluation.evaluation_metadata;
    procedureId = (meta as any)?.procedure_id ?? null;
  }

  if (!procedureId) return { tasks: [], allCompleted: false };

  const procData = await prisma.luc_procedure.findUnique({
    where: { procedure_id: procedureId },
    select: { procedure_steps: true },
  });

  const steps = procData?.procedure_steps as ProcedureSteps | null;

  if (!steps?.tasks || !Array.isArray(steps.tasks) || (steps.tasks as any[]).length === 0) {
    return { tasks: [], allCompleted: false };
  }

  const newTasks: StoredTask[] = [];
  let order = 1;
  let taskId = 1;

  for (const procTask of steps.tasks as any[]) {
    if (Array.isArray(procTask.checklist)) {
      for (const cl of procTask.checklist) {
        newTasks.push({
          task_id: taskId++,
          task_code: cl.checklist_code || `CL_${order}`,
          task_name: cl.checklist_name || procTask.title || 'Checklist item',
          task_type: 'checklist',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }

    if (Array.isArray(procTask.assignment)) {
      for (const asg of procTask.assignment) {
        newTasks.push({
          task_id: taskId++,
          task_code: asg.assignment_code || `ASG_${order}`,
          task_name: asg.assignment_name || procTask.title || 'Assignment item',
          task_type: 'assignment',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }

    if (Array.isArray(procTask.communication)) {
      for (const comm of procTask.communication) {
        newTasks.push({
          task_id: taskId++,
          task_code: comm.communication_code || `COMM_${order}`,
          task_name: comm.communication_name || procTask.title || 'Communication item',
          task_type: 'communication',
          task_status: 'pending',
          task_order: order++,
        });
      }
    }
  }

  if (newTasks.length === 0) return { tasks: [], allCompleted: false };

  planningJson.procedure_tasks = newTasks;

  await prisma.planning.updateMany({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    data: { planning_json: planningJson },
  });

  const checklistCodes = newTasks.filter((t) => t.task_type === 'checklist').map((t) => t.task_code);
  const checklistJsonMap = await fetchChecklistJsonMap(ownerId, checklistCodes);

  const tasks: EvaluationTask[] = newTasks.map((t) => ({
    ...t,
    checklist_json: t.task_type === 'checklist' ? (checklistJsonMap.get(t.task_code) ?? null) : null,
  }));

  return { tasks, allCompleted: false };
}

export async function updatePlanningTask(
  ownerId: number,
  planningId: number,
  taskId: number,
  newStatus: 'pending' | 'in_progress' | 'completed' | 'skipped'
): Promise<{ success: boolean; message?: string }> {
  const planningBase = await prisma.planning.findFirst({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    select: { planning_id: true, planning_json: true },
  });

  if (!planningBase) return { success: false, message: 'Planning not found or access denied' };

  let planningJson: Record<string, any> = {};
  const raw = planningBase.planning_json;
  if (raw) {
    planningJson = typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, any>);
  }

  if (!Array.isArray(planningJson.procedure_tasks)) {
    return { success: false, message: 'Planning tasks not initialised — fetch tasks first' };
  }

  const idx = (planningJson.procedure_tasks as StoredTask[]).findIndex((t) => t.task_id === taskId);
  if (idx === -1) return { success: false, message: `Task ${taskId} not found` };

  planningJson.procedure_tasks[idx].task_status = newStatus;

  await prisma.planning.updateMany({
    where: { planning_id: planningId, fk_owner_id: ownerId },
    data: { planning_json: planningJson },
  });

  return { success: true };
}
