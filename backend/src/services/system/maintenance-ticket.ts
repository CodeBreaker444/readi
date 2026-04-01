'use server';

import { supabase } from '@/backend/database/database';
import { refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import { sendNotificationToRoles, sendNotificationToUser } from '@/backend/services/notification/notification-service';
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
  uploadFileToS3,
} from '@/lib/s3Client';


export async function hasOpenTicketForTool(toolId: number): Promise<boolean> {
  const { data } = await supabase
    .from('maintenance_ticket')
    .select('ticket_id')
    .eq('fk_tool_id', toolId)
    .neq('ticket_status', 'CLOSED')
    .limit(1)
    .maybeSingle();

  return !!data;
}

/**
 * Throws if the given tool already has an open (non-closed) maintenance ticket.
 * Use this before creating a new report to prevent duplicate tickets.
 */
export async function assertNoOpenTicketForTool(toolId: number): Promise<void> {
  const { data: openTicket } = await supabase
    .from('maintenance_ticket')
    .select('ticket_id')
    .eq('fk_tool_id', toolId)
    .neq('ticket_status', 'CLOSED')
    .limit(1)
    .maybeSingle();

  if (openTicket) {
    throw new Error(
      'This system already has an open maintenance ticket. Close the existing ticket before reporting a new issue.'
    );
  }
}

export async function assertToolNotInMaintenance(toolId: number): Promise<void> {
  const { data: openTicket } = await supabase
    .from('maintenance_ticket')
    .select('ticket_id')
    .eq('fk_tool_id', toolId)
    .neq('ticket_status', 'CLOSED')
    .limit(1)
    .maybeSingle();

  if (openTicket) {
    throw new Error(
      'This system is currently in maintenance. Close the maintenance ticket before assigning it to an operation.'
    );
  }
}

export async function getTicketList(owner_id: number, tool_id?: number): Promise<MaintenanceTicket[]> {
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
        tool_name,
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

  if (owner_id) query = query.eq('fk_owner_id', owner_id);
  if (tool_id) query = query.eq('fk_tool_id', tool_id);

  const { data, error } = await query;
  if (error) throw new Error(`getTicketList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    ticket_id:           row.ticket_id,
    fk_owner_id:         row.fk_owner_id,
    fk_tool_id:          row.fk_tool_id,
    ticket_type:         row.ticket_type ?? 'STANDARD',
    entity_type:         'AIRCRAFT' as const,
    ticket_status:       row.ticket_status ?? 'OPEN',
    ticket_priority:     row.ticket_priority ?? 'MEDIUM',
    assigned_to_user_id: row.assigned_to_user_id ?? null,
    opened_by:           'system',
    opened_at:           row.reported_at ?? row.created_at,
    closed_at:           row.closed_at ?? null,
    note:                row.resolution_notes ?? null,
    created_at:          row.created_at,
    updated_at:          row.updated_at,
    drone_code:          row.tool?.tool_code ?? '—',
    drone_serial:        row.tool?.tool_name ?? '—',
    drone_model:         row.tool?.tool_model
      ? `${row.tool.tool_model.manufacturer ?? ''} ${row.tool.tool_model.model_name ?? ''}`.trim()
      : '—',
    assigner_name:  row.assignee
      ? `${row.assignee.first_name ?? ''} ${row.assignee.last_name ?? ''}`.trim()
      : 'Unassigned',
    assigner_email: row.assignee?.email ?? '',
    trigger_params: null,
  }));
}



export async function createTicket(payload: CreateTicketPayload): Promise<number> {
  const targets = payload.components?.length ? payload.components : [null];

  const rows = targets.map((componentId) => ({
    fk_owner_id:         payload.fk_owner_id,
    fk_tool_id:          payload.fk_tool_id,
    fk_component_id:     componentId ?? null,
    ticket_title:        componentId
      ? `Component Maintenance - #${componentId}`
      : `Maintenance - System #${payload.fk_tool_id}`,
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
    .insert(rows)
    .select('ticket_id');

  if (error) throw new Error(`createTicket: ${error.message}`);
  if (!data || data.length === 0) throw new Error('createTicket: no rows returned');

  const ticketId: number = data[0].ticket_id;
  const reporter = payload.reporter_name ?? `User #${payload.fk_user_id}`;
  const issueDetail = payload.note?.trim() ? `${payload.note.trim()}` : 'No description provided.';
  await addTicketEvent(ticketId, 'CREATED', `Reported by ${reporter}: ${issueDetail}`, payload.reporter_email, payload.fk_user_id);

  return ticketId;
}



export async function closeTicket(payload: CloseTicketPayload): Promise<void> {
  const { data: ticket, error: fetchErr } = await supabase
    .from('maintenance_ticket')
    .select('ticket_id, fk_tool_id, fk_component_id, ticket_status, fk_owner_id, reported_by_user_id, ticket_title')
    .eq('ticket_id', payload.ticket_id)
    .single();

  if (fetchErr || !ticket) throw new Error('Ticket not found');
  if (ticket.ticket_status === 'CLOSED') throw new Error('Ticket is already closed');

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];

  const { error: updateErr } = await supabase
    .from('maintenance_ticket')
    .update({
      ticket_status:    'CLOSED',
      closed_at:        now.toISOString(),
      resolution_notes: payload.note ?? null,
    })
    .eq('ticket_id', payload.ticket_id);

  if (updateErr) throw new Error(`closeTicket update: ${updateErr.message}`);

  const { error: maintErr } = await supabase
    .from('tool_maintenance')
    .insert({
      fk_tool_id:              ticket.fk_tool_id,
      maintenance_type:        'CORRECTIVE',
      maintenance_description: payload.note ?? 'Maintenance completed via ticket closure',
      completed_date:          todayDate,
      performed_by_user_id:    payload.closed_by ?? null,
      maintenance_status:      'COMPLETED',
      maintenance_notes:       payload.note ?? null,
    });

  if (maintErr) throw new Error(`closeTicket tool_maintenance insert: ${maintErr.message}`);

  await resetComponentCounters(ticket.fk_tool_id, now.toISOString(), ticket.fk_component_id ?? null);

  // Restore system to OPERATIONAL
  await setSystemOperationalStatus(ticket.fk_tool_id, 'OPERATIONAL');

  // Restore all NOT_OPERATIONAL components of this tool to OPERATIONAL
  await setAllComponentsOperational(ticket.fk_tool_id);

  await addTicketEvent(
    payload.ticket_id,
    'CLOSED',
    payload.note ?? 'Ticket closed'
  );

  // Send notifications (fire-and-forget)
  const systemCode = await getToolCode(ticket.fk_tool_id);
  const notifTitle = `Maintenance Complete — ${systemCode}`;
  const notifMsg = `Maintenance ticket closed. ${systemCode} is now operational.${payload.note ? ` Note: ${payload.note}` : ''}`;
  const actionUrl = '/systems/maintenance-tickets';

  // Notify the pilot who reported the issue
  if (ticket.reported_by_user_id) {
    sendNotificationToUser(ticket.reported_by_user_id, notifTitle, notifMsg, actionUrl).catch(() => {});
  }
  // Notify OPM users
  if (ticket.fk_owner_id) {
    sendNotificationToRoles(ticket.fk_owner_id, ['OPM'], notifTitle, notifMsg, actionUrl).catch(() => {});
  }
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
  const { error } = await supabase
    .from('maintenance_ticket_report')
    .insert({
      fk_ticket_id:   payload.ticket_id,
      report_title:   'Intervention Report',
      report_content: payload.report_text,
      report_type:    'INTERVENTION',
      generated_at:   new Date().toISOString(),
    });

  if (error) throw new Error(`addReport: ${error.message}`);

  await addTicketEvent(payload.ticket_id, 'REPORT_ADDED', payload.report_text.slice(0, 120), payload.reporter_email, payload.reporter_user_id);

  if (payload.close_report === 'Y') {
    await closeTicket({
      ticket_id: payload.ticket_id,
      note:      payload.report_text,
    });
  }
}



export async function getTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  const { data, error } = await supabase
    .from('maintenance_ticket_event')
    .select('event_id, event_type, event_description, event_data, created_at')
    .eq('fk_ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`getTicketEvents: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    event_id:      row.event_id,
    fk_ticket_id:  ticketId,
    event_type:    row.event_type,
    event_message: row.event_description ?? '',
    created_by:    (row.event_data as any)?.email ?? null,
    created_at:    row.created_at,
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
  const s3Url   = buildS3Url(fileKey);

  await uploadFileToS3(fileKey, file);

  const { error: dbError } = await supabase
    .from('ticket_attachment')
    .insert({
      fk_ticket_id:        ticketId,
      file_name:           file.name,
      file_key:            fileKey,
      file_type:           file.type || 'application/octet-stream',
      file_size:           file.size,
      file_description:    description || null,
      s3_region:           REGION,
      s3_url:              s3Url,
      uploaded_by:         uploadedBy,
      uploaded_by_user_id: uploadedByUserId ?? null,
      uploaded_at:         new Date().toISOString(),
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


// ─── LOOKUPS ─────────────────────────────────────────────────────────────────

export async function getDroneList(ownerId: number): Promise<DroneOption[]> {
  const { data, error } = await supabase
    .from('tool')
    .select('tool_id, tool_code, tool_name, fk_status_id')
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y')
    .order('tool_code');

  if (error) throw new Error(`getDroneList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    tool_id:     row.tool_id,
    tool_code:   row.tool_code ?? '',
    tool_desc:   row.tool_name ?? '',
    tool_status: String(row.fk_status_id ?? 'UNKNOWN'),
  }));
}

export async function getComponentList(toolId: number): Promise<ComponentOption[]> {
  await refreshMaintenanceDaysForTool(toolId);

  const { data, error } = await supabase
    .from('tool_component')
    .select('component_id, component_name, component_type, serial_number')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  if (error) throw new Error(`getComponentList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    tool_component_id: row.component_id,
    component_type:    row.component_type ?? row.component_name ?? '',
    component_sn:      row.serial_number ?? '',
  }));
}

export async function getUserList(ownerId: number, profileCode?: string): Promise<UserOption[]> {
  let query = supabase
    .from('users')
    .select('user_id, first_name, last_name, email, user_role')
    .eq('fk_owner_id', ownerId)
    .eq('user_active', 'Y');

  if (profileCode && profileCode !== 'ALL') {
    query = query.eq('user_role', profileCode);
  }

  const { data, error } = await query.order('first_name');
  if (error) throw new Error(`getUserList: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    user_id:      row.user_id,
    fullname:     `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    email:        row.email ?? '',
    user_profile: row.user_role ?? '',
  }));
}



async function addTicketEvent(
  ticketId: number,
  eventType: string,
  message: string,
  createdByEmail?: string,
  createdByUserId?: number
): Promise<void> {
  await supabase.from('maintenance_ticket_event').insert({
    fk_ticket_id:       ticketId,
    event_type:         eventType,
    event_description:  message,
    created_by_user_id: createdByUserId ?? null,
    event_data:         createdByEmail ? { email: createdByEmail } : null,
    created_at:         new Date().toISOString(),
  });
}

async function getToolCode(toolId: number): Promise<string> {
  const { data } = await supabase
    .from('tool')
    .select('tool_code')
    .eq('tool_id', toolId)
    .single();
  return data?.tool_code ?? `System #${toolId}`;
}

export async function setSystemOperationalStatus(toolId: number, status: string): Promise<void> {
  const { data: tool } = await supabase
    .from('tool')
    .select('tool_metadata')
    .eq('tool_id', toolId)
    .single();

  await supabase
    .from('tool')
    .update({
      tool_metadata: {
        ...(tool?.tool_metadata ?? {}),
        status,
      },
    })
    .eq('tool_id', toolId);
}

export async function setComponentsOperationalStatus(componentIds: number[], status: string): Promise<void> {
  if (!componentIds.length) return;
  const { data: comps } = await supabase
    .from('tool_component')
    .select('component_id, component_metadata')
    .in('component_id', componentIds);

  await Promise.all(
    (comps ?? []).map((comp) =>
      supabase
        .from('tool_component')
        .update({
          component_metadata: {
            ...(comp.component_metadata ?? {}),
            component_status: status,
          },
        })
        .eq('component_id', comp.component_id),
    ),
  );
}

async function setAllComponentsOperational(toolId: number): Promise<void> {
  const { data: comps } = await supabase
    .from('tool_component')
    .select('component_id, component_metadata')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  const nonOperational = (comps ?? []).filter(
    (comp) => (comp.component_metadata?.component_status ?? 'OPERATIONAL') !== 'OPERATIONAL',
  );

  await Promise.all(
    nonOperational.map((comp) =>
      supabase
        .from('tool_component')
        .update({
          component_metadata: {
            ...(comp.component_metadata ?? {}),
            component_status: 'OPERATIONAL',
          },
        })
        .eq('component_id', comp.component_id),
    ),
  );
}

/**
 * Reset component maintenance counters to 0 after a maintenance is completed.
 * Called when a ticket is closed.
 */
async function resetComponentCounters(toolId: number, resetAt: string, componentId?: number | null): Promise<void> {
  let query = supabase
    .from('tool_component')
    .select('component_id, maintenance_cycle')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  if (componentId) {
    query = query.eq('component_id', componentId);
  }

  const { data: components } = await query;

  if (!components || components.length === 0) return;

  await Promise.all(
    components.map((comp) => {
      const cycleType = comp.maintenance_cycle ?? 'NONE';
      if (cycleType === 'NONE') return null;

      const resetPayload: Record<string, any> = { last_maintenance_date: resetAt };
      if (cycleType === 'HOURS' || cycleType === 'MIXED') resetPayload.current_maintenance_hours = 0;
      if (cycleType === 'FLIGHTS' || cycleType === 'MIXED') resetPayload.current_maintenance_flights = 0;
      if (cycleType === 'DAYS' || cycleType === 'MIXED') resetPayload.current_maintenance_days = 0;

      return supabase
        .from('tool_component')
        .update(resetPayload)
        .eq('component_id', comp.component_id);
    }).filter(Boolean),
  );
}

export async function getComponentTicketEvents(componentId: number) {
  const { data, error } = await supabase
    .from('maintenance_ticket')
    .select(`
      ticket_id,
      ticket_status,
      reported_at,
      closed_at,
      resolution_notes,
      maintenance_ticket_event (
        event_id,
        event_type,
        event_description,
        created_at
      )
    `)
    .eq('fk_component_id', componentId)
    .order('ticket_id', { ascending: false });

  if (error) throw new Error(`getComponentTicketEvents: ${error.message}`);
  return data ?? [];
}
