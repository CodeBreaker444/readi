import { seedLucProcedureProgressFromSteps } from '@/backend/services/operation/luc-procedure-progress';
import { AttachmentUploadResponse, CreateOperationSchema, ListOperationsQuerySchema, Operation, OperationAttachment, OperationsListResponse, UpdateOperationSchema } from '@/config/types/operation';
import { prisma } from '@/lib/prisma';
import { buildS3Url, deleteFileFromS3, getPresignedDownloadUrl, REGION, uploadFileToS3 } from '@/lib/s3Client';

const STATUS_NAME_TO_ID: Record<string, number> = {
  Scheduled: 1,
  'In Progress': 2,
  Completed: 3,
  Cancelled: 4,
};

function asUtc(ts: Date | string | null | undefined): string | null {
  if (!ts) return null;
  const s = ts instanceof Date ? ts.toISOString() : ts;
  return s.endsWith('Z') || s.includes('+') ? s : s + 'Z';
}

export async function listOperations(
  params: ListOperationsQuerySchema,
  ownerId: number
): Promise<OperationsListResponse> {
  const { page, pageSize, status, search, pilot_id, tool_id, client_id, date_start, date_end } = params;
  const skip = (page - 1) * pageSize;

  let planningIds: number[] | undefined;
  if (client_id) {
    const plannings = await prisma.planning.findMany({
      where: { fk_owner_id: ownerId, fk_client_id: client_id },
      select: { planning_id: true },
    });
    planningIds = plannings.map((p) => p.planning_id);
    if (planningIds.length === 0) return { data: [], total: 0, page, pageSize };
  }

  const where: any = {
    fk_owner_id: ownerId,
    ...(date_start && { scheduled_start: { gte: new Date(date_start) } }),
    ...(date_end && { scheduled_start: { lte: new Date(date_end + 'T23:59:59') } }),
    ...(status && { status_name: status }),
    ...(pilot_id && { fk_pilot_user_id: pilot_id }),
    ...(tool_id && { fk_tool_id: tool_id }),
    ...(planningIds && { fk_planning_id: { in: planningIds } }),
    ...(search && {
      OR: [
        { mission_code: { contains: search, mode: 'insensitive' } },
        { mission_name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [data, total] = await Promise.all([
    prisma.pilot_mission.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { created_at: 'desc' },
      select: {
        pilot_mission_id: true,
        mission_code: true,
        mission_name: true,
        mission_description: true,
        scheduled_start: true,
        actual_start: true,
        actual_end: true,
        flight_duration: true,
        location: true,
        distance_flown: true,
        notes: true,
        fk_pilot_user_id: true,
        fk_tool_id: true,
        fk_mission_status_id: true,
        fk_planning_id: true,
        fk_erp_group_id: true,
        fk_mission_type_id: true,
        fk_mission_category_id: true,
        fk_luc_procedure_id: true,
        luc_procedure_progress: true,
        luc_completed_at: true,
        mission_metadata: true,
        fk_owner_id: true,
        status_name: true,
        created_at: true,
        updated_at: true,
        users: { select: { first_name: true, last_name: true } },
        tool: { select: { tool_code: true, tool_name: true } },
        pilot_mission_category: { select: { category_name: true } },
        pilot_mission_type: { select: { type_name: true } },
        planning: { select: { planning_name: true, client: { select: { client_name: true } } } },
        client: { select: { client_name: true } },
      },
    }),
    prisma.pilot_mission.count({ where }),
  ]);

  const operations = data.map((row) => ({
    ...row,
    actual_start: asUtc(row.actual_start),
    actual_end: asUtc(row.actual_end),
    pilot_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim()
      : null,
    tool_code: row.tool?.tool_code ?? null,
    tool_name: row.tool?.tool_name ?? null,
    category_name: row.pilot_mission_category?.category_name ?? null,
    type_name: row.pilot_mission_type?.type_name ?? null,
    planning_name: row.planning?.planning_name ?? null,
    client_name: row.planning?.client?.client_name ?? row.client?.client_name ?? null,
    visual_observer_ids: (row.mission_metadata as any)?.visual_observers ?? null,
  })) as unknown as Operation[];

  const toolIds = [...new Set(operations.filter((op) => op.fk_tool_id).map((op) => op.fk_tool_id as number))];
  if (toolIds.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [primaryComps, expiredComps] = await Promise.all([
      prisma.tool_component.findMany({
        where: {
          fk_tool_id: { in: toolIds },
          component_metadata: { path: ['is_primary'], equals: true },
        },
        select: { fk_tool_id: true, component_code: true, component_name: true },
      }),
      prisma.tool_component.findMany({
        where: {
          fk_tool_id:      { in: toolIds },
          component_active: 'Y',
          expiration_date:  { not: null, lte: today },
        },
        select: { fk_tool_id: true },
      }),
    ]);

    const primaryMap = new Map<number, string>();
    primaryComps.forEach((c) => {
      if (c.fk_tool_id) primaryMap.set(c.fk_tool_id, c.component_code || c.component_name || '');
    });
    const nonOpSet = new Set<number>(expiredComps.map((c) => c.fk_tool_id));

    operations.forEach((op) => {
      (op as any).primary_component_code = op.fk_tool_id ? (primaryMap.get(op.fk_tool_id) ?? null) : null;
      (op as any).tool_status = op.fk_tool_id && nonOpSet.has(op.fk_tool_id) ? 'NOT_OPERATIONAL' : null;
    });
  }

  return { data: operations, total, page, pageSize };
}

export async function getOperation(id: number): Promise<Operation | null> {
  const data = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: id },
    include: {
      users: { select: { first_name: true, last_name: true } },
      tool: { select: { tool_code: true } },
      client: { select: { client_name: true } },
      planning: { select: { planning_name: true, client: { select: { client_name: true } } } },
      pilot_mission_category: { select: { category_name: true } },
      pilot_mission_type: { select: { type_name: true } },
    },
  });

  if (!data) return null;

  return {
    ...data,
    actual_start: asUtc(data.actual_start),
    actual_end: asUtc(data.actual_end),
    pilot_name: data.users
      ? `${data.users.first_name ?? ''} ${data.users.last_name ?? ''}`.trim()
      : null,
    tool_code: data.tool?.tool_code ?? null,
    client_name: data.planning?.client?.client_name ?? data.client?.client_name ?? null,
    planning_name: data.planning?.planning_name ?? null,
    category_name: data.pilot_mission_category?.category_name ?? null,
    type_name: data.pilot_mission_type?.type_name ?? null,
    visual_observer_ids: (data.mission_metadata as any)?.visual_observers ?? null,
  } as unknown as Operation;
}

export async function createOperation(input: CreateOperationSchema, ownerId: number): Promise<Operation> {
  const codeToChild = input.mission_code;

  const existing = await prisma.pilot_mission.findFirst({
    where: { mission_code: codeToChild, fk_owner_id: ownerId },
    select: { pilot_mission_id: true },
  });

  if (existing) {
    throw new Error(`An operation with code ${codeToChild} already exists.`);
  }

  const fkLuc = input.fk_luc_procedure_id;
  if (!fkLuc) throw new Error('Procedure is required');

  const procRow = await prisma.luc_procedure.findFirst({
    where: {
      procedure_id: fkLuc,
      fk_owner_id: ownerId,
      procedure_status: 'MISSION',
      procedure_active: 'Y',
    },
    select: { procedure_steps: true },
  });

  if (!procRow) throw new Error('Procedure not found or not available for missions');

  const luc_procedure_progress =
    seedLucProcedureProgressFromSteps(procRow.procedure_steps) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

  const rawObserverIds: number[] | null = (input as any).visual_observer_ids ?? null;
  let visualObservers: { user_id: number; name: string }[] | null = null;
  if (rawObserverIds?.length) {
    const observerUsers = await prisma.public_users.findMany({
      where: { user_id: { in: rawObserverIds } },
      select: { user_id: true, first_name: true, last_name: true },
    });
    if (observerUsers.length) {
      visualObservers = observerUsers.map((u) => ({
        user_id: u.user_id,
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      }));
    }
  }

  const baseInsert: any = {
    mission_code: codeToChild,
    mission_name: input.mission_name,
    mission_description: input.mission_description ?? null,
    status_name: input.status_name,
    fk_mission_status_id: STATUS_NAME_TO_ID[input.status_name] ?? 1,
    scheduled_start: input.scheduled_start ? new Date(input.scheduled_start) : null,
    actual_end: input.actual_end ? new Date(input.actual_end) : null,
    location: input.location ?? null,
    notes: input.notes ?? null,
    fk_owner_id: ownerId,
    fk_pilot_user_id: input.fk_pilot_user_id,
    fk_tool_id: (input as any).fk_tool_id ?? null,
    fk_client_id: (input as any).fk_client_id ?? null,
    fk_planning_id: input.fk_planning_id ?? null,
    fk_mission_type_id: (input as any).fk_mission_type_id ?? null,
    fk_mission_category_id: (input as any).fk_mission_category_id ?? null,
    fk_luc_procedure_id: fkLuc,
    fk_erp_group_id: (input as any).fk_erp_group_id ?? null,
    luc_procedure_progress: luc_procedure_progress as any,
    luc_completed_at: null,
    ...(visualObservers?.length && { mission_metadata: { visual_observers: visualObservers } }),
  };

  const inserted = await prisma.pilot_mission.create({
    data: baseInsert,
    select: { pilot_mission_id: true },
  });

  const full = await getOperation(inserted.pilot_mission_id);
  if (!full) throw new Error('Failed to fetch created operation');
  return full;
}

export async function updateOperation(id: number, input: UpdateOperationSchema): Promise<Operation> {
  const updatePayload: Record<string, unknown> = {};
  if (input.mission_code !== undefined) updatePayload.mission_code = input.mission_code;
  if (input.mission_name !== undefined) updatePayload.mission_name = input.mission_name;
  if (input.mission_description !== undefined) updatePayload.mission_description = input.mission_description;
  if (input.scheduled_start !== undefined) updatePayload.scheduled_start = input.scheduled_start ? new Date(input.scheduled_start) : null;
  if (input.actual_start !== undefined) updatePayload.actual_start = input.actual_start ? new Date(input.actual_start) : null;
  if (input.actual_end !== undefined) updatePayload.actual_end = input.actual_end ? new Date(input.actual_end) : null;
  if (input.flight_duration !== undefined) updatePayload.flight_duration = input.flight_duration;
  if (input.location !== undefined) updatePayload.location = input.location;
  if (input.notes !== undefined) updatePayload.notes = input.notes;
  if (input.fk_pilot_user_id !== undefined) updatePayload.fk_pilot_user_id = input.fk_pilot_user_id;
  if (input.fk_tool_id !== undefined) updatePayload.fk_tool_id = input.fk_tool_id;
  if ((input as any).fk_client_id !== undefined) updatePayload.fk_client_id = (input as any).fk_client_id;
  if (input.fk_planning_id !== undefined) updatePayload.fk_planning_id = input.fk_planning_id;
  if (input.fk_mission_status_id !== undefined) updatePayload.fk_mission_status_id = input.fk_mission_status_id;
  if ((input as any).fk_mission_type_id !== undefined) updatePayload.fk_mission_type_id = (input as any).fk_mission_type_id;
  if ((input as any).fk_mission_category_id !== undefined) updatePayload.fk_mission_category_id = (input as any).fk_mission_category_id;
  if ((input as any).status_name !== undefined) updatePayload.status_name = (input as any).status_name;
  if (input.distance_flown !== undefined) updatePayload.distance_flown = input.distance_flown;
  if ((input as any).fk_erp_group_id !== undefined) updatePayload.fk_erp_group_id = (input as any).fk_erp_group_id;

  await prisma.pilot_mission.update({
    where: { pilot_mission_id: id },
    data: updatePayload,
  });

  const full = await getOperation(id);
  if (!full) throw new Error('Failed to fetch updated operation');
  return full;
}


export async function deleteOperation(id: number): Promise<void> {
  const attachments = await prisma.operation_attachment.findMany({
    where: { fk_operation_id: id },
    select: { file_key: true },
  });

  if (attachments.length) {
    await Promise.allSettled(attachments.map((a) => deleteFileFromS3(a.file_key)));
    await prisma.operation_attachment.deleteMany({ where: { fk_operation_id: id } });
  }

  await prisma.pilot_mission.delete({ where: { pilot_mission_id: id } });
}

function buildOperationS3Key(operationId: number, originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `operations/${operationId}/${Date.now()}_${safe}`;
}

export async function uploadOperationAttachment(
  operationId: number,
  file: File,
  description?: string,
  uploadedBy?: string
): Promise<AttachmentUploadResponse> {
  const op = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: operationId },
    select: { pilot_mission_id: true },
  });

  if (!op) throw new Error('Operation not found');

  const key = buildOperationS3Key(operationId, file.name);
  await uploadFileToS3(key, file);
  const s3Url = buildS3Url(key);

  const data = await prisma.operation_attachment.create({
    data: {
      fk_operation_id: operationId,
      file_name: file.name,
      file_key: key,
      file_type: file.type || null,
      file_size: BigInt(file.size),
      file_description: description ?? null,
      s3_region: REGION,
      s3_url: s3Url,
      uploaded_by: uploadedBy ?? 'web',
    },
  });

  const presignedDownloadUrl = await getPresignedDownloadUrl(key);
  return { attachment: data as unknown as OperationAttachment, presignedDownloadUrl };
}

export async function listOperationAttachments(
  operationId: number
): Promise<OperationAttachment[]> {
  const data = await prisma.operation_attachment.findMany({
    where: { fk_operation_id: operationId },
    orderBy: { uploaded_at: 'desc' },
  });

  return data as unknown as OperationAttachment[];
}

export async function fetchOperationAttachment(attId: number, opId: number) {
  const data = await prisma.operation_attachment.findFirst({
    where: { attachment_id: attId, fk_operation_id: opId },
    select: { file_key: true },
  });

  if (!data) throw new Error('Attachment not found');
  return data.file_key;
}

export async function deleteOperationAttachment(attachmentId: number): Promise<void> {
  const data = await prisma.operation_attachment.findUnique({
    where: { attachment_id: attachmentId },
    select: { file_key: true },
  });

  if (!data) throw new Error('Attachment not found');

  await deleteFileFromS3(data.file_key);

  await prisma.operation_attachment.delete({ where: { attachment_id: attachmentId } });
}

export async function createRecurringOperations(
  input: {
    mission_name: string;
    mission_code?: string;
    mission_description?: string | null;
    scheduled_start: string;
    actual_end?: string | null;
    fk_pilot_user_id: number;
    fk_tool_id?: number | null;
    fk_mission_type_id?: number | null;
    fk_mission_category_id?: number | null;
    fk_planning_id?: number | null;
    fk_luc_procedure_id: number;
    location?: string | null;
    notes?: string | null;
    days_of_week: number[];
    recur_until: string;
    mission_group_label?: string | null;
  },
  ownerId: number
): Promise<{
  count: number;
  first_id: number;
  missions: Array<{ pilotMissionId: number; dccMissionId: string; startDateTime: string }>;
}> {
  const recurringGroupId = crypto.randomUUID();

  const procRow = await prisma.luc_procedure.findFirst({
    where: {
      procedure_id: input.fk_luc_procedure_id,
      fk_owner_id: ownerId,
      procedure_status: 'MISSION',
      procedure_active: 'Y',
    },
    select: { procedure_steps: true },
  });

  if (!procRow) throw new Error('Procedure not found or not available for missions');

  const luc_procedure_progress =
    seedLucProcedureProgressFromSteps(procRow.procedure_steps) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

  const startMatch = input.scheduled_start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!startMatch) throw new Error('Invalid scheduled_start format. Expected YYYY-MM-DDTHH:mm');
  const [, sYear, sMonth, sDay, sHour, sMin] = startMatch.map(Number);

  let durationMs = 0;
  if (input.actual_end) {
    const endMatch = input.actual_end.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (endMatch) {
      const [, eYear, eMonth, eDay, eHour, eMin] = endMatch.map(Number);
      durationMs = Math.max(
        Date.UTC(eYear, eMonth - 1, eDay, eHour, eMin) - Date.UTC(sYear, sMonth - 1, sDay, sHour, sMin),
        0
      );
    }
  }

  const untilMatch = input.recur_until.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!untilMatch) throw new Error('Invalid recur_until format. Expected YYYY-MM-DD');
  const [, uYear, uMonth, uDay] = untilMatch.map(Number);
  const untilDate = new Date(Date.UTC(uYear, uMonth - 1, uDay, 23, 59, 59));

  if (new Date(Date.UTC(sYear, sMonth - 1, sDay)) > untilDate) {
    throw new Error('Recurrence end date must be on or after the start date');
  }

  const daysSet = new Set(input.days_of_week.map(Number));
  let cursorDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));

  const rows: any[] = [];
  const rowMeta: Array<{ dccMissionId: string; startDateTime: string }> = [];
  let instanceIndex = 0;
  let iterations = 0;

  while (cursorDate <= untilDate && iterations < 1000) {
    iterations++;
    if (daysSet.has(cursorDate.getUTCDay())) {
      instanceIndex++;
      const y = cursorDate.getUTCFullYear();
      const m = cursorDate.getUTCMonth();
      const d = cursorDate.getUTCDate();
      const instanceStart = new Date(Date.UTC(y, m, d, sHour, sMin, 0, 0));
      const instanceCode = input.mission_code
        ? `${input.mission_code}-${instanceIndex}`
        : crypto.randomUUID();

      rowMeta.push({ dccMissionId: instanceCode, startDateTime: instanceStart.toISOString() });
      rows.push({
        fk_owner_id: ownerId,
        mission_name: input.mission_name,
        mission_description: input.mission_description ?? null,
        status_name: 'Scheduled',
        fk_mission_status_id: 1,
        fk_pilot_user_id: input.fk_pilot_user_id,
        fk_tool_id: input.fk_tool_id ?? null,
        fk_mission_type_id: input.fk_mission_type_id ?? null,
        fk_mission_category_id: input.fk_mission_category_id ?? null,
        fk_planning_id: input.fk_planning_id ?? null,
        fk_luc_procedure_id: input.fk_luc_procedure_id,
        luc_procedure_progress: luc_procedure_progress as any,
        luc_completed_at: null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        mission_code: instanceCode,
        scheduled_start: instanceStart,
        actual_end: durationMs > 0 ? new Date(instanceStart.getTime() + durationMs) : null,
        recurring_group_id: recurringGroupId,
        mission_date_until: new Date(input.recur_until),
        mission_group_label: input.mission_group_label ?? null,
      });
    }
    cursorDate = new Date(Date.UTC(
      cursorDate.getUTCFullYear(), cursorDate.getUTCMonth(), cursorDate.getUTCDate() + 1
    ));
  }

  if (rows.length === 0) throw new Error('No matching days found in the recurrence range');

  await prisma.pilot_mission.createMany({ data: rows });

  const missionCodes = rowMeta.map((r) => r.dccMissionId);
  const created = await prisma.pilot_mission.findMany({
    where: { mission_code: { in: missionCodes }, fk_owner_id: ownerId },
    orderBy: { scheduled_start: 'asc' },
    select: { pilot_mission_id: true, scheduled_start: true, mission_code: true },
  });

  return {
    count: rows.length,
    first_id: created[0].pilot_mission_id,
    missions: created.map((row, i) => ({
      pilotMissionId: row.pilot_mission_id,
      dccMissionId: rowMeta[i]?.dccMissionId ?? row.mission_code ?? '',
      startDateTime: rowMeta[i]?.startDateTime ?? row.scheduled_start?.toISOString() ?? '',
    })),
  };
}

export async function batchSetPilot(
  missionIds: number[],
  pilotId: number,
  ownerId: number
): Promise<{ updated: number[]; skipped: number[]; pilotName: string; updatedMissions: { id: number; code: string }[] }> {
  const missions = await prisma.pilot_mission.findMany({
    where: { pilot_mission_id: { in: missionIds }, fk_owner_id: ownerId },
    select: { pilot_mission_id: true, status_name: true, mission_code: true },
  });

  const planned = missions.filter((m) => m.status_name === 'PLANNED');
  const skipped = missions.filter((m) => m.status_name !== 'PLANNED').map((m) => m.pilot_mission_id);

  if (planned.length === 0) return { updated: [], skipped, pilotName: '', updatedMissions: [] };

  const ids = planned.map((m) => m.pilot_mission_id);
  await prisma.pilot_mission.updateMany({
    where: { pilot_mission_id: { in: ids } },
    data: { fk_pilot_user_id: pilotId, updated_at: new Date() },
  });

  const pilotUser = await prisma.public_users.findUnique({
    where: { user_id: pilotId },
    select: { username: true },
  });
  const pilotName = pilotUser?.username ?? '';
  const updatedMissions = planned.map((m) => ({ id: m.pilot_mission_id, code: m.mission_code ?? '' }));

  return { updated: ids, skipped, pilotName, updatedMissions };
}

export async function batchAutofill(
  missionIds: number[],
  ownerId: number
): Promise<{ processed: number[]; skipped: number[] }> {
  const missions = await prisma.pilot_mission.findMany({
    where: { pilot_mission_id: { in: missionIds }, fk_owner_id: ownerId },
    select: {
      pilot_mission_id: true,
      status_name: true,
      fk_pilot_user_id: true,
      actual_end: true,
      fk_luc_procedure_id: true,
      luc_procedure_progress: true,
    },
  });

  const eligible = missions.filter((m) => m.status_name === 'COMPLETED' && m.fk_pilot_user_id);
  const skipped = missions.filter((m) => m.status_name !== 'COMPLETED' || !m.fk_pilot_user_id).map((m) => m.pilot_mission_id);

  if (eligible.length === 0) return { processed: [], skipped };

  const now = new Date();
  const ids = eligible.map((m) => m.pilot_mission_id);

  await prisma.pilot_mission.updateMany({
    where: { pilot_mission_id: { in: ids }, actual_end: null },
    data: { actual_end: now, updated_at: now },
  });

  const uniqueProcedureIds = [...new Set(eligible.map((m) => m.fk_luc_procedure_id).filter((id): id is number => id !== null))];

  if (uniqueProcedureIds.length > 0) {
    const procedures = await prisma.luc_procedure.findMany({
      where: { procedure_id: { in: uniqueProcedureIds } },
      select: { procedure_id: true, procedure_steps: true },
    });

    const procedureMap: Record<number, any> = {};
    for (const proc of procedures) {
      procedureMap[proc.procedure_id] = proc.procedure_steps;
    }

    await Promise.all(
      eligible.map(async (m) => {
        if (!m.fk_luc_procedure_id) return;
        const steps = procedureMap[m.fk_luc_procedure_id];
        if (!steps) return;

        const tasksDef = (steps as any).tasks;
        let checklistCodes: string[] = [];
        let communicationCodes: string[] = [];
        let assignmentCodes: string[] = [];

        if (Array.isArray(tasksDef)) {
          checklistCodes = tasksDef.flatMap((t: any) => (t.checklist ?? []).map((c: any) => c.checklist_code).filter(Boolean));
          communicationCodes = tasksDef.flatMap((t: any) => (t.communication ?? []).map((c: any) => c.communication_code).filter(Boolean));
          assignmentCodes = tasksDef.flatMap((t: any) => (t.assignment ?? []).map((a: any) => a.assignment_code).filter(Boolean));
        } else if (tasksDef && typeof tasksDef === 'object') {
          checklistCodes = ((tasksDef as any).checklist ?? []).map((c: any) => c.checklist_code).filter(Boolean);
          communicationCodes = ((tasksDef as any).communication ?? []).map((c: any) => c.communication_code).filter(Boolean);
          assignmentCodes = ((tasksDef as any).assignment ?? []).map((a: any) => a.assignment_code).filter(Boolean);
        }

        const existing: Record<string, Record<string, string>> = (m.luc_procedure_progress as any) ?? {
          checklist: {},
          communication: {},
          assignment: {},
        };
        const progress: Record<string, Record<string, string>> = {
          checklist: { ...existing.checklist },
          communication: { ...existing.communication },
          assignment: { ...existing.assignment },
        };

        for (const code of checklistCodes) progress.checklist[code] = 'Y';
        for (const code of communicationCodes) progress.communication[code] = 'Y';
        for (const code of assignmentCodes) progress.assignment[code] = 'Y';

        await prisma.pilot_mission.update({
          where: { pilot_mission_id: m.pilot_mission_id },
          data: { luc_procedure_progress: progress as any, luc_completed_at: now, updated_at: now },
        });
      })
    );
  }

  return { processed: ids, skipped };
}

export async function getPilotOptions(ownerId: number) {
  return prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_role: 'PIC', user_active: 'Y' },
    orderBy: { first_name: 'asc' },
    select: { user_id: true, first_name: true, last_name: true },
  });
}

export async function getToolOptions(ownerId: number) {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    orderBy: { tool_name: 'asc' },
    select: { tool_id: true, tool_name: true, tool_code: true },
  });

  if (tools.length === 0) return tools;

  const toolIds = tools.map((t) => t.tool_id);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openTickets, droneComponents, maintComps, expiredComps] = await Promise.all([
    prisma.maintenance_ticket.findMany({
      where: { fk_tool_id: { in: toolIds }, NOT: { ticket_status: 'CLOSED' } },
      select: { fk_tool_id: true },
    }),
    prisma.tool_component.findMany({
      where: { fk_tool_id: { in: toolIds }, component_type: 'DRONE', component_active: 'Y' },
      select: { fk_tool_id: true },
    }),
    prisma.tool_component.findMany({
      where: { fk_tool_id: { in: toolIds }, component_active: 'Y' },
      select: {
        fk_tool_id: true,
        maintenance_cycle_day: true,
        maintenance_cycle_hour: true,
        maintenance_cycle_flight: true,
        current_maintenance_days: true,
        current_usage_hours: true,
        current_maintenance_flights: true,
      },
    }),
    prisma.tool_component.findMany({
      where: {
        fk_tool_id:      { in: toolIds },
        component_active: 'Y',
        expiration_date:  { not: null, lte: today },
      },
      select: { fk_tool_id: true },
    }),
  ]);

  const inMaintenanceSet  = new Set<number>(openTickets.map((t) => t.fk_tool_id!).filter(Boolean));
  const hasDroneSet       = new Set<number>(droneComponents.map((c) => c.fk_tool_id).filter(Boolean));
  const nonOperationalSet = new Set<number>(expiredComps.map((c) => c.fk_tool_id));
  const maintenanceDueSet = new Set<number>();

  maintComps.forEach((c) => {
    if (!c.fk_tool_id || inMaintenanceSet.has(c.fk_tool_id)) return;
    const dayDue    = Number(c.maintenance_cycle_day)    > 0 && Number(c.current_maintenance_days)    >= Number(c.maintenance_cycle_day);
    const hourDue   = Number(c.maintenance_cycle_hour)   > 0 && Number(c.current_usage_hours)         >= Number(c.maintenance_cycle_hour);
    const flightDue = Number(c.maintenance_cycle_flight) > 0 && Number(c.current_maintenance_flights) >= Number(c.maintenance_cycle_flight);
    if (dayDue || hourDue || flightDue) maintenanceDueSet.add(c.fk_tool_id);
  });

  return tools.map((t) => ({
    ...t,
    in_maintenance:     inMaintenanceSet.has(t.tool_id),
    has_drone_component: hasDroneSet.has(t.tool_id),
    maintenance_due:    maintenanceDueSet.has(t.tool_id),
    is_non_operational: nonOperationalSet.has(t.tool_id),
  }));
}

export async function getMissionTypeOptions(ownerId: number) {
  return prisma.pilot_mission_type.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { type_name: 'asc' },
    select: { mission_type_id: true, type_name: true },
  });
}

export async function getMissionCategoryOptions(ownerId: number) {
  return prisma.pilot_mission_category.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { category_name: 'asc' },
    select: { category_id: true, category_name: true },
  });
}

export async function getClientOptions(ownerId: number) {
  return prisma.client.findMany({
    where: { fk_owner_id: ownerId, client_active: 'Y' },
    orderBy: { client_name: 'asc' },
    select: { client_id: true, client_name: true },
  });
}

export async function getPlanningOptions(ownerId: number) {
  const data = await prisma.planning.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: [{ planning_active: 'desc' }, { planning_name: 'asc' }],
    select: {
      planning_id: true,
      planning_name: true,
      fk_client_id: true,
      planning_active: true,
      client: { select: { client_name: true } },
    },
  });

  return data.map((p) => ({
    planning_id: p.planning_id,
    planning_name: p.planning_name ?? '',
    fk_client_id: p.fk_client_id,
    planning_active: ((p.planning_active ?? 'Y') as string).trim() as 'Y' | 'N',
    client_name: p.client?.client_name ?? '',
  }));
}

export async function getLucProcedureOptions(ownerId: number) {
  return prisma.luc_procedure.findMany({
    where: { fk_owner_id: ownerId, procedure_status: 'MISSION', procedure_active: 'Y' },
    orderBy: { procedure_name: 'asc' },
    select: { procedure_id: true, procedure_name: true, procedure_code: true, procedure_steps: true },
  });
}