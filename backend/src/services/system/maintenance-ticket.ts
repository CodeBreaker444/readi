import { supabase } from '@/backend/database/database';
import type {
  AddReportPayload,
  AssignTicketPayload,
  CloseTicketPayload,
  ComponentOption,
  CreateTicketPayload,
  DroneOption,
  MaintenanceTicket,
  TicketEvent,
  UserOption,
} from '@/config/types/maintenance';
import {
  REGION,
  buildS3Key,
  buildS3Url,
  deleteFileFromS3,
  getPresignedDownloadUrl,
  uploadFileToS3
} from '@/lib/s3Client';


export async function getTicketList(owner_id: number): Promise<MaintenanceTicket[]> {
  let query = supabase
    .from('maintenance_ticket')
    .select(`
      ticket_id,
      fk_owner_id,
      fk_tool_id,
      ticket_type,
      ticket_status,
      ticket_priority,
      assigned_to_user_id,
      reported_at,
      closed_at,
      resolution_notes,
      created_at,
      updated_at,
      tool:fk_tool_id (
        tool_code,
        tool_serial_number,
        tool_model:fk_model_id (
          model_name,
          manufacturer
        )
      ),
      assignee:assigned_to_user_id (
        user_id,
        first_name,
        last_name,
        email
      )
    `)
    .order('ticket_id', { ascending: false });

  if (owner_id) {
    query = query.eq('fk_owner_id', owner_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getTicketList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    ticket_id: row.ticket_id,
    fk_owner_id: row.fk_owner_id,
    fk_tool_id: row.fk_tool_id,
    ticket_type: row.ticket_type ?? 'STANDARD',
    entity_type: 'AIRCRAFT',
    ticket_status: row.ticket_status ?? 'OPEN',
    ticket_priority: row.ticket_priority ?? 'MEDIUM',
    assigned_to_user_id: row.assigned_to_user_id,
    opened_by: 'system',
    opened_at: row.reported_at ?? row.created_at,
    closed_at: row.closed_at ?? null,
    note: row.resolution_notes ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    drone_code: row.tool?.tool_code ?? '-',
    drone_serial: row.tool?.tool_serial_number ?? '-',
    drone_model: row.tool?.tool_model
      ? `${row.tool.tool_model.manufacturer ?? ''} ${row.tool.tool_model.model_name ?? ''}`.trim()
      : '-',
    assigner_name: row.assignee
      ? `${row.assignee.first_name ?? ''} ${row.assignee.last_name ?? ''}`.trim()
      : 'Unassigned',
    assigner_email: row.assignee?.email ?? '',
    trigger_params: null,
  }));
}


export async function createTicket(payload: CreateTicketPayload): Promise<number> {
  const targets = payload.components?.length
    ? payload.components
    : [null];

  const insert = targets.map((componentId) => ({
    fk_owner_id:         payload.fk_owner_id,
    fk_tool_id:          payload.fk_tool_id,
    ticket_title:        componentId
      ? `Component Maintenance - #${componentId}`
      : `Maintenance - Tool #${payload.fk_tool_id}`,
    ticket_type:         payload.type,
    ticket_priority:     payload.priority,
    ticket_status:       'OPEN',
    reported_by_user_id: payload.fk_user_id,
    assigned_to_user_id: payload.assigned_to ?? null,
    resolution_notes:    payload.note ?? null,
    reported_at:         new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('maintenance_ticket')
    .insert(insert)
    .select('ticket_id')
    .single();

  if (error) throw new Error(`createTicket: ${error.message}`);

  const ticketId: number = data.ticket_id;

  await addTicketEvent(ticketId, 'CREATED', `Ticket created by user #${payload.fk_user_id}`);

  return ticketId;
}

export async function closeTicket(payload: CloseTicketPayload): Promise<void> {
  const { error } = await supabase
    .from('maintenance_ticket')
    .update({
      ticket_status: 'CLOSED',
      closed_at: new Date().toISOString(),
      resolution_notes: payload.note ?? null,
    })
    .eq('ticket_id', payload.ticket_id);

  if (error) throw new Error(`closeTicket: ${error.message}`);

  await addTicketEvent(
    payload.ticket_id,
    'CLOSED',
    payload.note ?? 'Ticket closed'
  );
}


export async function assignTicket(payload: AssignTicketPayload): Promise<void> {
  const { error } = await supabase
    .from('maintenance_ticket')
    .update({ assigned_to_user_id: payload.assigned_to })
    .eq('ticket_id', payload.ticket_id);

  if (error) throw new Error(`assignTicket: ${error.message}`);

  await addTicketEvent(
    payload.ticket_id,
    'ASSIGNED',
    `Ticket assigned to user #${payload.assigned_to}`
  );
}


export async function addReport(payload: AddReportPayload): Promise<void> {
  const { error } = await supabase.from('maintenance_ticket_report').insert({
    fk_ticket_id: payload.ticket_id,
    report_title: 'Intervention Report',
    report_content: payload.report_text,
    report_type: 'INTERVENTION',
    generated_at: new Date().toISOString(),
  });

  if (error) throw new Error(`addReport: ${error.message}`);

  await addTicketEvent(payload.ticket_id, 'REPORT_ADDED', payload.report_text.slice(0, 120));

  if (payload.close_report === 'Y') {
    await closeTicket({ ticket_id: payload.ticket_id, note: payload.report_text });
  }
}


export async function getTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  const { data, error } = await supabase
    .from('maintenance_ticket_event')
    .select('event_id, event_type, event_description, created_at')
    .eq('fk_ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`getTicketEvents: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    event_id: row.event_id,
    fk_ticket_id: ticketId,
    event_type: row.event_type,
    event_message: row.event_description ?? '',
    created_at: row.created_at,
  }));
}


export async function uploadAttachment(
  ticketId: number,
  file: File,
  description: string,
  uploadedBy: string,
  uploadedByUserId?: number
): Promise<{ file_key: string; s3_url: string }> {
  const fileKey = buildS3Key(ticketId, file.name);
  const s3Url = buildS3Url(fileKey);

  await uploadFileToS3(fileKey, file);

  const { error: dbError } = await supabase
    .from('ticket_attachment')
    .insert({
      fk_ticket_id: ticketId,
      file_name: file.name,
      file_key: fileKey,
      file_type: file.type || 'application/octet-stream',
      file_size: file.size,
      file_description: description || null,
      s3_region: REGION,
      s3_url: s3Url,
      uploaded_by: uploadedBy,
      uploaded_by_user_id: uploadedByUserId ?? null,
      uploaded_at: new Date().toISOString(),
    });

  if (dbError) throw new Error(`uploadAttachment (db): ${dbError.message}`);

  await addTicketEvent(ticketId, 'ATTACHMENT_ADDED', `File uploaded: ${file.name}`);

  return { file_key: fileKey, s3_url: s3Url };
}


export async function getTicketAttachments(ticketId: number) {
  const { data, error } = await supabase
    .from('ticket_attachment')
    .select('*')
    .eq('fk_ticket_id', ticketId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`getTicketAttachments: ${error.message}`);

  return Promise.all(
    (data ?? []).map(async (row) => ({
      ...row,
      download_url: await getPresignedDownloadUrl(row.file_key, 900),
    }))
  );
}


export async function deleteAttachment(attachmentId: number): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('ticket_attachment')
    .select('file_key, fk_ticket_id, file_name')
    .eq('attachment_id', attachmentId)
    .single();

  if (fetchError || !data) throw new Error('Attachment not found');

  await deleteFileFromS3(data.file_key);

  const { error: dbError } = await supabase
    .from('ticket_attachment')
    .delete()
    .eq('attachment_id', attachmentId);

  if (dbError) throw new Error(`deleteAttachment (db): ${dbError.message}`);

  await addTicketEvent(data.fk_ticket_id, 'ATTACHMENT_DELETED', `File deleted: ${data.file_name}`);
}


export async function getDroneList(ownerId: number): Promise<DroneOption[]> {
  const { data, error } = await supabase
    .from('tool')
    .select('tool_id, tool_code, tool_name, tool_serial_number, fk_status_id')
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y')
    .order('tool_code');

  if (error) throw new Error(`getDroneList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    tool_id: row.tool_id,
    tool_code: row.tool_code ?? '',
    tool_desc: row.tool_name ?? '',
    tool_status: String(row.fk_status_id ?? 'UNKNOWN'),
  }));
}


export async function getComponentList(toolId: number): Promise<ComponentOption[]> {
  const { data, error } = await supabase
    .from('tool_component')
    .select('component_id, component_name, component_type, serial_number')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  if (error) throw new Error(`getComponentList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    tool_component_id: row.component_id,
    component_type: row.component_type ?? row.component_name ?? '',
    component_sn: row.serial_number ?? '',
  }));
}


export async function getUserList(profileCode?: string): Promise<UserOption[]> {
  let query = supabase
    .from('users')
    .select('user_id, first_name, last_name, email, user_role')
    .eq('user_active', 'Y');

  if (profileCode && profileCode !== 'ALL') {
    query = query.eq('user_role', profileCode);
  }

  const { data, error } = await query.order('first_name');
  if (error) throw new Error(`getUserList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    user_id: row.user_id,
    fullname: `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    email: row.email ?? '',
    user_profile: row.user_role ?? '',
  }));
}


async function addTicketEvent(
  ticketId: number,
  eventType: string,
  message: string
): Promise<void> {
  await supabase.from('maintenance_ticket_event').insert({
    fk_ticket_id: ticketId,
    event_type: eventType,
    event_description: message,
    created_at: new Date().toISOString(),
  });
}