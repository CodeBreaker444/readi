import { supabase } from '@/backend/database/database';
import { seedLucProcedureProgressFromSteps } from '@/backend/services/operation/luc-procedure-progress';
import { AttachmentUploadResponse, CreateOperationSchema, ListOperationsQuerySchema, Operation, OperationAttachment, OperationsListResponse, UpdateOperationSchema } from '@/config/types/operation';
import { buildS3Url, deleteFileFromS3, getPresignedDownloadUrl, REGION, uploadFileToS3 } from '@/lib/s3Client';

const STATUS_NAME_TO_ID: Record<string, number> = {
  Scheduled: 1,
  'In Progress': 2,
  Completed: 3,
  Cancelled: 4,
}

// actual_start/actual_end are stored as TIMESTAMP WITHOUT TIME ZONE but are always set
// as UTC (via new Date().toISOString()). Append 'Z' so browsers parse them as UTC.
function asUtc(ts: string | null | undefined): string | null {
  if (!ts) return null;
  return ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
}

export async function listOperations(
  params: ListOperationsQuerySchema,
  ownerId: number
): Promise<OperationsListResponse> {
  const { page, pageSize, status, search, pilot_id, tool_id, client_id, date_start, date_end } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('pilot_mission')
    .select(
      `
      pilot_mission_id,
      mission_code,
      mission_name,
      mission_description,
      scheduled_start,
      actual_start,
      actual_end,
      flight_duration,
      location,
      distance_flown,
      notes,
      fk_pilot_user_id,
      fk_tool_id,
      fk_mission_status_id,
      fk_planning_id,
      fk_mission_type_id,
      fk_mission_category_id,
      fk_luc_procedure_id,
      luc_procedure_progress,
      luc_completed_at,
      fk_owner_id,
      status_name,
      created_at,
      updated_at,
      pilot:users!fk_pilot_user_id ( first_name, last_name ),
      tool:tool!fk_tool_id ( tool_code, tool_name ),
      category:pilot_mission_category!fk_mission_category_id ( category_name ),
      type_data:pilot_mission_type!fk_mission_type_id ( type_name ),
      planning:planning!fk_planning_id ( planning_name, client:client!fk_client_id ( client_name ) ),
      direct_client:client!fk_client_id ( client_name )
    `,
      { count: 'exact' }
    )
    .eq('fk_owner_id', ownerId)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (date_start) query = query.gte('scheduled_start', date_start);
  if (date_end) query = query.lte('scheduled_start', date_end + 'T23:59:59');
  if (status) query = query.eq('status_name', status);
  if (pilot_id) query = query.eq('fk_pilot_user_id', pilot_id);
  if (tool_id) query = query.eq('fk_tool_id', tool_id);
  if (client_id) {
    const { data: plannings } = await supabase
      .from('planning')
      .select('planning_id')
      .eq('fk_owner_id', ownerId)
      .eq('fk_client_id', client_id);
    const ids = (plannings ?? []).map((p: any) => p.planning_id);
    if (ids.length === 0) return { data: [], total: 0, page, pageSize };
    query = query.in('fk_planning_id', ids);
  }
  if (search) {
    query = query.or(
      `mission_code.ilike.%${search}%,mission_name.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list operations: ${error.message}`);

  const operations = (data ?? []).map((row: any) => ({
    ...row,
    actual_start: asUtc(row.actual_start),
    actual_end: asUtc(row.actual_end),
    pilot_name: row.pilot
      ? `${row.pilot.first_name ?? ''} ${row.pilot.last_name ?? ''}`.trim()
      : null,
    tool_code: row.tool?.tool_code ?? null,
    category_name: row.category?.category_name ?? null,
    type_name: row.type_data?.type_name ?? null,
    planning_name: row.planning?.planning_name ?? null,
    client_name: row.planning?.client?.client_name ?? row.direct_client?.client_name ?? null,
  })) as Operation[];

  return { data: operations, total: count ?? 0, page, pageSize };
}

export async function getOperation(id: number): Promise<Operation | null> {
  const { data, error } = await supabase
    .from('pilot_mission')
    .select(
      `
      *,
      pilot:users!fk_pilot_user_id ( first_name, last_name ),
      tool:tool!fk_tool_id ( tool_code ),
      direct_client:client!fk_client_id ( client_name ),
      planning:planning!fk_planning_id ( planning_name, client:client!fk_client_id ( client_name ) ),
      category:pilot_mission_category!fk_mission_category_id ( category_name ),
      type_data:pilot_mission_type!fk_mission_type_id ( type_name )
    `
    )
    .eq('pilot_mission_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get operation: ${error.message}`);
  }

  return {
    ...data,
    actual_start: asUtc(data.actual_start),
    actual_end: asUtc(data.actual_end),
    pilot_name: data.pilot
      ? `${data.pilot.first_name ?? ''} ${data.pilot.last_name ?? ''}`.trim()
      : null,
    tool_code: data.tool?.tool_code ?? null,
    client_name: data.planning?.client?.client_name ?? data.direct_client?.client_name ?? null,
    planning_name: data.planning?.planning_name ?? null,
    category_name: data.category?.category_name ?? null,
    type_name: data.type_data?.type_name ?? null,
  } as Operation;
}

export async function createOperation(input: CreateOperationSchema, ownerId: number): Promise<Operation> {
  const codeToChild = input.mission_code;

  const { data: existing } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id')
    .eq('mission_code', codeToChild)
    .eq('fk_owner_id', ownerId)
    .maybeSingle();

  if (existing) {
    throw new Error(`An operation with code ${codeToChild} already exists.`);
  }

  const fkLuc = input.fk_luc_procedure_id;
  if (!fkLuc) {
    throw new Error('Procedure is required');
  }
  const { data: procRow, error: procErr } = await supabase
    .from('luc_procedure')
    .select('procedure_steps')
    .eq('procedure_id', fkLuc)
    .eq('fk_owner_id', ownerId)
    .eq('procedure_status', 'MISSION')
    .eq('procedure_active', 'Y')
    .maybeSingle();
  if (procErr) throw new Error(`Procedure lookup failed: ${procErr.message}`);
  if (!procRow) {
    throw new Error('Procedure not found or not available for missions');
  }
  const luc_procedure_progress =
    seedLucProcedureProgressFromSteps(procRow.procedure_steps) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

  const { data: inserted, error } = await supabase
    .from('pilot_mission')
    .insert({
      mission_code: codeToChild,
      mission_name: input.mission_name,
      mission_description: input.mission_description ?? null,
      status_name: input.status_name,
      fk_mission_status_id: STATUS_NAME_TO_ID[input.status_name] ?? 1,
      scheduled_start: input.scheduled_start || null,
      actual_end: input.actual_end ?? null,
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
      luc_procedure_progress,
      luc_completed_at: null,
    })
    .select('pilot_mission_id')
    .single();

  if (error) throw new Error(`Failed to create operation: ${error.message}`);

  const full = await getOperation(inserted.pilot_mission_id);
  if (!full) throw new Error('Failed to fetch created operation');

  return full;
}

export async function updateOperation(id: number, input: UpdateOperationSchema): Promise<Operation> {
  const updatePayload: Record<string, unknown> = {};
  if (input.mission_code !== undefined) updatePayload.mission_code = input.mission_code;
  if (input.mission_name !== undefined) updatePayload.mission_name = input.mission_name;
  if (input.mission_description !== undefined) updatePayload.mission_description = input.mission_description;
  if (input.scheduled_start !== undefined) updatePayload.scheduled_start = input.scheduled_start || null;
  if (input.actual_start !== undefined) updatePayload.actual_start = input.actual_start || null;
  if (input.actual_end !== undefined) updatePayload.actual_end = input.actual_end || null;
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
  if (input.max_altitude !== undefined) updatePayload.max_altitude = input.max_altitude;

  const { error } = await supabase
    .from('pilot_mission')
    .update(updatePayload)
    .eq('pilot_mission_id', id);

  if (error) throw new Error(`Failed to update operation: ${error.message}`);

  const full = await getOperation(id);
  if (!full) throw new Error('Failed to fetch updated operation');
  return full;
}


export async function deleteOperation(id: number): Promise<void> {

  const { data: attachments } = await supabase
    .from('ticket_attachment')
    .select('file_key')
    .eq('fk_ticket_id', id);

  if (attachments?.length) {
    await Promise.allSettled(attachments.map((a: any) => deleteFileFromS3(a.file_key)));
    await supabase.from('ticket_attachment').delete().eq('fk_ticket_id', id);
  }

  const { error } = await supabase
    .from('pilot_mission')
    .delete()
    .eq('pilot_mission_id', id);

  if (error) throw new Error(`Failed to delete operation: ${error.message}`);
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

  const { data: op } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id')
    .eq('pilot_mission_id', operationId)
    .single();

  if (!op) throw new Error('Operation not found');

  const key = buildOperationS3Key(operationId, file.name);
  await uploadFileToS3(key, file);
  const s3Url = buildS3Url(key);

  const { data, error } = await supabase
    .from('operation_attachment')
    .insert({
      fk_operation_id: operationId,
      file_name: file.name,
      file_key: key,
      file_type: file.type || null,
      file_size: file.size,
      file_description: description ?? null,
      s3_region: REGION,
      s3_url: s3Url,
      uploaded_by: uploadedBy ?? 'web',
    })
    .select()
    .single();

  if (error) {
    await deleteFileFromS3(key).catch(() => {});
    throw new Error(`Failed to save attachment metadata: ${error.message}`);
  }

  const presignedDownloadUrl = await getPresignedDownloadUrl(key);
  return { attachment: data as OperationAttachment, presignedDownloadUrl };
}

export async function listOperationAttachments(
  operationId: number
): Promise<OperationAttachment[]> {
  const { data, error } = await supabase
    .from('operation_attachment')
    .select('*')
    .eq('fk_operation_id', operationId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`Failed to list attachments: ${error.message}`);
  return (data ?? []) as OperationAttachment[];
}

export async function fetchOperationAttachment(attId: number, opId: number) {
  const { data, error } = await supabase
    .from('operation_attachment')
    .select('file_key')
    .eq('attachment_id', attId)
    .eq('fk_operation_id', opId)
    .single();

  if (error || !data) {
    throw new Error('Attachment not found');
  }
  return data.file_key;
}

export async function deleteOperationAttachment(attachmentId: number): Promise<void> {

  const { data, error: fetchErr } = await supabase
    .from('ticket_attachment')
    .select('file_key')
    .eq('attachment_id', attachmentId)
    .single();

  if (fetchErr || !data) throw new Error('Attachment not found');

  await deleteFileFromS3(data.file_key);

  const { error } = await supabase
    .from('ticket_attachment')
    .delete()
    .eq('attachment_id', attachmentId);

  if (error) throw new Error(`Failed to delete attachment record: ${error.message}`);
}

export async function createRecurringOperations(
  input: {
    mission_name: string;
    mission_code?: string;
    mission_description?: string | null;
    scheduled_start: string;
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

  const { data: procRow, error: procErr } = await supabase
    .from('luc_procedure')
    .select('procedure_steps')
    .eq('procedure_id', input.fk_luc_procedure_id)
    .eq('fk_owner_id', ownerId)
    .eq('procedure_status', 'MISSION')
    .eq('procedure_active', 'Y')
    .maybeSingle();
  if (procErr) throw new Error(`Procedure lookup failed: ${procErr.message}`);
  if (!procRow) {
    throw new Error('Procedure not found or not available for missions');
  }
  const luc_procedure_progress =
    seedLucProcedureProgressFromSteps(procRow.procedure_steps) ?? {
      checklist: {},
      communication: {},
      assignment: {},
    };

  const startMatch = input.scheduled_start.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!startMatch) throw new Error('Invalid scheduled_start format. Expected YYYY-MM-DDTHH:mm');
  const [, sYear, sMonth, sDay, sHour, sMin] = startMatch.map(Number);

  const untilMatch = input.recur_until.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!untilMatch) throw new Error('Invalid recur_until format. Expected YYYY-MM-DD');
  const [, uYear, uMonth, uDay] = untilMatch.map(Number);
  const untilDate = new Date(Date.UTC(uYear, uMonth - 1, uDay, 23, 59, 59));

  if (new Date(Date.UTC(sYear, sMonth - 1, sDay)) > untilDate) {
    throw new Error('Recurrence end date must be on or after the start date');
  }

  const daysSet = new Set(input.days_of_week.map(Number));
  let cursorDate = new Date(Date.UTC(sYear, sMonth - 1, sDay));

  const rows: object[] = [];
  const rowMeta: Array<{ dccMissionId: string; startDateTime: string }> = [];
  let instanceIndex = 0;
  let iterations = 0;

  while (cursorDate <= untilDate && iterations < 1000) {
    iterations++;
    const dayOfWeek = cursorDate.getUTCDay();

    if (daysSet.has(dayOfWeek)) {
      instanceIndex++;
      const y = cursorDate.getUTCFullYear();
      const m = cursorDate.getUTCMonth();
      const d = cursorDate.getUTCDate();

      const instanceStart = new Date(Date.UTC(y, m, d, sHour, sMin, 0, 0));
      // mission_code doubles as DCC mission ID; generate a UUID when none provided
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
        luc_procedure_progress,
        luc_completed_at: null,
        location: input.location ?? null,
        notes: input.notes ?? null,
        mission_code: instanceCode,
        scheduled_start: instanceStart.toISOString(),
        actual_end: null,
        recurring_group_id: recurringGroupId,
        mission_date_until: input.recur_until,
        mission_group_label: input.mission_group_label ?? null,
      });
    }

    cursorDate = new Date(Date.UTC(
      cursorDate.getUTCFullYear(),
      cursorDate.getUTCMonth(),
      cursorDate.getUTCDate() + 1
    ));
  }

  if (rows.length === 0) throw new Error('No matching days found in the recurrence range');

  const { data, error } = await supabase
    .from('pilot_mission')
    .insert(rows)
    .select('pilot_mission_id, scheduled_start');

  if (error) throw new Error(`Failed to create recurring operations: ${error.message}`);
  return {
    count: rows.length,
    first_id: data[0].pilot_mission_id,
    missions: data.map((row: any, i: number) => ({
      pilotMissionId: row.pilot_mission_id,
      dccMissionId:   rowMeta[i].dccMissionId,
      startDateTime:  rowMeta[i].startDateTime,
    })),
  };
}

export async function batchSetPilot(
  missionIds: number[],
  pilotId: number,
  ownerId: number,
): Promise<{ updated: number[]; skipped: number[], pilotName: string}> {
  const { data: missions, error } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id, status_name')
    .in('pilot_mission_id', missionIds)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(`Failed to fetch missions: ${error.message}`);

  const planned = (missions ?? []).filter((m: any) => m.status_name === 'PLANNED');
  const skipped = (missions ?? [])
    .filter((m: any) => m.status_name !== 'PLANNED')
    .map((m: any) => m.pilot_mission_id);

  if (planned.length === 0) return { updated: [], skipped, pilotName:'' };

  const ids = planned.map((m: any) => m.pilot_mission_id);
  const { error: updateError } = await supabase
    .from('pilot_mission')
    .update({ fk_pilot_user_id: pilotId, updated_at: new Date().toISOString() })
    .in('pilot_mission_id', ids);

  if (updateError) throw new Error(`Failed to set pilot: ${updateError.message}`);

  const { data: pilotUser } = await supabase
        .from('users')
        .select('username')
        .eq('user_id', pilotId)
        .single();
      const pilotName = pilotUser?.username
        

  return { updated: ids, skipped, pilotName };
}

export async function batchAutofill(
  missionIds: number[],
  ownerId: number
): Promise<{ processed: number[]; skipped: number[] }> {
  const { data: missions, error } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id, status_name, fk_pilot_user_id, actual_end, fk_luc_procedure_id, luc_procedure_progress')
    .in('pilot_mission_id', missionIds)
    .eq('fk_owner_id', ownerId);

  if (error) throw new Error(`Failed to fetch missions: ${error.message}`);

  //completed and pilot assigned
  const eligible = (missions ?? []).filter(
    (m: any) => m.status_name === 'COMPLETED' && m.fk_pilot_user_id
  );
  const skipped = (missions ?? [])
    .filter((m: any) => m.status_name !== 'COMPLETED' || !m.fk_pilot_user_id)
    .map((m: any) => m.pilot_mission_id);

  if (eligible.length === 0) return { processed: [], skipped };

  const now = new Date().toISOString();
  const ids = eligible.map((m: any) => m.pilot_mission_id);

  // filling actual_end for missions that completed but have no end timestamp
  const { error: updateError } = await supabase
    .from('pilot_mission')
    .update({ actual_end: now, updated_at: now })
    .in('pilot_mission_id', ids)
    .is('actual_end', null);

  if (updateError) throw new Error(`Failed to autofill missions: ${updateError.message}`);

  // marking all checklist/communication/assignment tasks as completed
  const uniqueProcedureIds = [...new Set(eligible.map((m: any) => m.fk_luc_procedure_id).filter(Boolean))];

  if (uniqueProcedureIds.length > 0) {
    const { data: procedures } = await supabase
      .from('luc_procedure')
      .select('procedure_id, procedure_steps')
      .in('procedure_id', uniqueProcedureIds);

    const procedureMap: Record<number, any> = {};
    for (const proc of procedures ?? []) {
      procedureMap[proc.procedure_id] = proc.procedure_steps;
    }

    await Promise.all(
      eligible.map(async (m: any) => {
        const steps = procedureMap[m.fk_luc_procedure_id];
        if (!steps) return;

        const tasksDef = steps.tasks;
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

        await supabase
          .from('pilot_mission')
          .update({
            luc_procedure_progress: progress,
            luc_completed_at: now,
            updated_at: now,
          })
          .eq('pilot_mission_id', m.pilot_mission_id)
          .eq('fk_owner_id', ownerId);
      })
    );
  }

  return { processed: ids, skipped };
}

export async function getPilotOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, last_name')
    .eq('fk_owner_id', ownerId)
    .eq('user_role', 'PIC')
    .eq('user_active', 'Y')
    .order('first_name');

  if (error) throw new Error(error.message);
  return data;
}

export async function getToolOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('tool')
    .select('tool_id, tool_name, tool_code')
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y')
    .order('tool_name');

  if (error) throw new Error(error.message);

  const tools = data ?? [];
  if (tools.length === 0) return tools;

  const toolIds = tools.map((t: any) => t.tool_id);

  const [{ data: openTickets }, { data: droneComponents }] = await Promise.all([
    supabase
      .from('maintenance_ticket')
      .select('fk_tool_id')
      .in('fk_tool_id', toolIds)
      .neq('ticket_status', 'CLOSED'),
    supabase
      .from('tool_component')
      .select('fk_tool_id')
      .in('fk_tool_id', toolIds)
      .eq('component_type', 'DRONE')
      .eq('component_active', 'Y'),
  ]);

  const inMaintenanceSet = new Set<number>(
    (openTickets ?? []).map((t: any) => t.fk_tool_id)
  );
  const hasDroneSet = new Set<number>(
    (droneComponents ?? []).map((c: any) => c.fk_tool_id)
  );

  return tools.map((t: any) => ({
    ...t,
    in_maintenance: inMaintenanceSet.has(t.tool_id),
    has_drone_component: hasDroneSet.has(t.tool_id),
  }));
}

export async function getMissionTypeOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('pilot_mission_type')
    .select('mission_type_id, type_name')
    .eq('fk_owner_id', ownerId)
    .eq('is_active', true)
    .order('type_name');

  if (error) throw new Error(`Types error: ${error.message}`);
  return data;
}

export async function getMissionCategoryOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('pilot_mission_category')
    .select('category_id, category_name')
    .eq('fk_owner_id', ownerId)
    .eq('is_active', true)
    .order('category_name');

  if (error) throw new Error(`Categories error: ${error.message}`);
  return data;
}

export async function getClientOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('client')
    .select('client_id, client_name')
    .eq('fk_owner_id', ownerId)
    .eq('client_active', 'Y')
    .order('client_name');

  if (error) throw new Error(`Clients error: ${error.message}`);
  return data;
}

export async function getPlanningOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('planning')
    .select('planning_id, planning_name, fk_client_id, client:client!fk_client_id(client_name)')
    .eq('fk_owner_id', ownerId)
    .eq('planning_active', 'Y')
    .order('planning_name');

  if (error) throw new Error(`Planning error: ${error.message}`);
  return (data || []).map((p: any) => ({
    planning_id: p.planning_id,
    planning_name: p.planning_name,
    fk_client_id: p.fk_client_id,
    client_name: Array.isArray(p.client) ? p.client[0]?.client_name : p.client?.client_name ?? '',
  }));
}

export async function getLucProcedureOptions(ownerId: number) {
  const { data, error } = await supabase
    .from('luc_procedure')
    .select('procedure_id, procedure_name, procedure_code, procedure_steps')
    .eq('fk_owner_id', ownerId)
    .eq('procedure_status', 'MISSION')
    .eq('procedure_active', 'Y')
    .order('procedure_name');

  if (error) throw new Error(`procedures error: ${error.message}`);
  return data ?? [];
}