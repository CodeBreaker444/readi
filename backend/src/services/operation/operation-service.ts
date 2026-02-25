import { supabase } from '@/backend/database/database';
import { AttachmentUploadResponse, CreateOperationSchema, ListOperationsQuerySchema, Operation, OperationAttachment, OperationsListResponse, UpdateOperationSchema } from '@/config/types/operation';
import { BUCKET, buildS3Key, buildS3Url, deleteFileFromS3, getPresignedDownloadUrl, REGION, uploadFileToS3 } from '@/lib/s3Client';

export async function listOperations(
  params: ListOperationsQuerySchema,
  ownerId: number
): Promise<OperationsListResponse> {
  const { page, pageSize, status, search, pilot_id, date_start, date_end } = params;
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
      max_altitude,
      notes,
      fk_pilot_user_id,
      fk_tool_id,
      fk_mission_status_id,
      fk_planning_id,
      fk_owner_id,
      status_name,
      created_at,
      updated_at,
      pilot:users!fk_pilot_user_id ( first_name, last_name ),
      tool:tool!fk_tool_id ( tool_code, tool_name )
    `,
      { count: 'exact' }
    )
    .eq('fk_owner_id', ownerId )   
    .range(from, to)
    .order('created_at', { ascending: false });

  if (date_start) query = query.gte('scheduled_start', date_start);
  if (date_end) query = query.lte('scheduled_start', date_end + 'T23:59:59');
  if (status) query = query.eq('status_name', status);
  if (pilot_id) query = query.eq('fk_pilot_user_id', pilot_id);
  if (search) {
    query = query.or(
      `mission_code.ilike.%${search}%,mission_name.ilike.%${search}%,location.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list operations: ${error.message}`);

  const operations = (data ?? []).map((row: any) => ({
    ...row,
    pilot_name: row.pilot
      ? `${row.pilot.first_name ?? ''} ${row.pilot.last_name ?? ''}`.trim()
      : null,
    tool_code: row.tool?.tool_code ?? null,
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
      tool:tool!fk_tool_id ( tool_code )
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
    pilot_name: data.pilot
      ? `${data.pilot.first_name ?? ''} ${data.pilot.last_name ?? ''}`.trim()
      : null,
    tool_code: data.tool?.tool_code ?? null,
  } as Operation;
}

export async function createOperation(input: CreateOperationSchema, ownerId: number): Promise<Operation> {
  const codeToChild = input.mission_code  

  const { data: existing } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id')
    .eq('mission_code', codeToChild)
    .eq('fk_owner_id', ownerId) 
    .maybeSingle();

  if (existing) {
    throw new Error(`An operation with code ${codeToChild} already exists.`);
  }

  const { data: inserted, error } = await supabase
    .from('pilot_mission')
    .insert({
      mission_code: codeToChild,
      mission_name: input.mission_name,
      mission_description: input.mission_description ?? null,
      status_name: input.status_name,
      scheduled_start: input.scheduled_start || null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      fk_owner_id: ownerId,
      fk_pilot_user_id: input.fk_pilot_user_id,
      fk_tool_id: (input as any).fk_tool_id ?? null,
      fk_planning_id: input.fk_planning_id ?? null,
      fk_mission_type_id: (input as any).fk_mission_type_id ?? null,
      fk_mission_category_id: (input as any).fk_mission_category_id ?? null,
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
  if (input.fk_planning_id !== undefined) updatePayload.fk_planning_id = input.fk_planning_id;
  if (input.fk_mission_status_id !== undefined) updatePayload.fk_mission_status_id = input.fk_mission_status_id;
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

  const key = buildS3Key(operationId, file.name);
  await uploadFileToS3(key, file);
  const s3Url = buildS3Url(key);

  const { data, error } = await supabase
    .from('ticket_attachment')
    .insert({
      fk_ticket_id: operationId,
      file_name: file.name,
      file_key: key,
      file_type: file.type || null,
      file_size: file.size,
      file_description: description ?? null,
      s3_bucket: BUCKET,
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
    .from('ticket_attachment')
    .select('*')
    .eq('fk_ticket_id', operationId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`Failed to list attachments: ${error.message}`);

  const withUrls = await Promise.all(
    (data ?? []).map(async (att: any) => ({
      ...att,
      download_url: await getPresignedDownloadUrl(att.file_key).catch(() => att.s3_url),
    }))
  );

  return withUrls as OperationAttachment[];
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

export async function getPilotOptions(ownerId: number,userId:number) {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, first_name, last_name')
    .eq('fk_owner_id', ownerId)
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
  return data;
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