'use server';

import { supabase } from '@/backend/database/database';
import { sendNotificationToClientManagers, sendNotificationToRoles, sendNotificationToUser } from '@/backend/services/notification/notification-service';
import { 
  sendTicketCreatedEmail,
  sendTicketClosedEmail as sendModuleTicketClosedEmail,
  sendTicketAssignedEmail,
  sendInterventionStartedEmail,
  sendInterventionEndedEmail,
} from '@/backend/services/settings/module-email-notification-service';
import { getToolName, getUserName } from '@/backend/services/shared/entity-names';
import { refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
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
import { prisma } from '@/lib/prisma';
import {
  REGION,
  buildS3Key,
  buildS3Url,
  deleteFileFromS3,
  getPresignedDownloadUrl,
  uploadFileToS3,
} from '@/lib/s3Client';
import { Prisma } from '@prisma/client';


export async function hasOpenTicketForTool(toolId: number): Promise<boolean> {
  const ticket = await prisma.maintenance_ticket.findFirst({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: { ticket_id: true },
  });
  return !!ticket;
}

export async function assertNoOpenTicketForTool(toolId: number): Promise<void> {
  const openTicket = await prisma.maintenance_ticket.findFirst({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: { ticket_id: true },
  });

  if (openTicket) {
    throw new Error(
      'This system already has an open maintenance ticket. Close the existing ticket before reporting a new issue.'
    );
  }
}

/**
 * A new ticket is allowed while others are open as long as it targets specific components
 * that no open ticket already covers. System-level tickets (no components) cover everything,
 * so they conflict with any open ticket.
 */
export async function assertCanCreateTicket(toolId: number, componentIds: number[] = []): Promise<void> {
  const openTickets = await prisma.maintenance_ticket.findMany({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: {
      fk_component_id: true,
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
    },
  });
  if (!openTickets.length) return;

  const conflict = () => new Error(
    'An open maintenance ticket already covers this system or the selected components. Close it first or select different components.'
  );
  if (!componentIds.length) throw conflict();

  const covered = new Set<number>();
  for (const t of openTickets) {
    const ids = [t.fk_component_id, ...t.maintenance_ticket_item.map((i) => i.fk_component_id)]
      .filter((id): id is number => id != null);
    if (!ids.length) throw conflict(); // open system-level ticket covers every component
    ids.forEach((id) => covered.add(id));
  }
  if (componentIds.some((id) => covered.has(id))) throw conflict();
}

export async function assertToolNotInMaintenance(toolId: number): Promise<void> {
  const openTicket = await prisma.maintenance_ticket.findFirst({
    where: { fk_tool_id: toolId, ticket_status: { not: 'CLOSED' } },
    select: { ticket_id: true },
  });

  if (openTicket) {
    throw new Error(
      'This system is currently in maintenance. Close the maintenance ticket before assigning it to an operation.'
    );
  }
}

export async function assertToolNotNonOperational(toolId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: expiredComp } = await supabase
    .from('tool_component')
    .select('component_id, component_name')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y')
    .lte('expiration_date', today)
    .not('expiration_date', 'is', null)
    .limit(1)
    .maybeSingle();

  if (expiredComp) {
    throw new Error(
      `This system is not operational — component "${expiredComp.component_name}" has expired. It cannot be used for mission creation.`
    );
  }

  const { data: tool } = await supabase
    .from('tool')
    .select('tool_metadata')
    .eq('tool_id', toolId)
    .maybeSingle();

  if (tool?.tool_metadata?.status === 'NOT_OPERATIONAL') {
    throw new Error(
      'This system is not operational and cannot be used for mission creation.'
    );
  }
}

export async function getTicketList(owner_id: number, tool_id?: number, assignedToUserId?: number): Promise<MaintenanceTicket[]> {
  const rows = await prisma.maintenance_ticket.findMany({
    where: {
      ...(owner_id && { fk_owner_id: owner_id }),
      ...(tool_id && { fk_tool_id: tool_id }),
      ...(assignedToUserId && { assigned_to_user_id: assignedToUserId }),
    },
    select: {
      ticket_id: true,
      fk_owner_id: true,
      fk_tool_id: true,
      fk_component_id: true,
      ticket_type: true,
      ticket_status: true,
      ticket_priority: true,
      assigned_to_user_id: true,
      reported_at: true,
      closed_at: true,
      resolution_notes: true,
      location_latitude: true,
      location_longitude: true,
      location_pseudo_name: true,
      intervention_started_at: true,
      intervention_ended_at: true,
      created_at: true,
      updated_at: true,
      tool: {
        select: {
          tool_code: true,
          tool_name: true,
          tool_description: true,
          tool_metadata: true,
          tool_model: {
            select: { model_name: true, manufacturer: true },
          },
        },
      },
      users_maintenance_ticket_assigned_to_user_idTousers: {
        select: { user_id: true, first_name: true, last_name: true, email: true },
      },
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
    },
    orderBy: { ticket_id: 'desc' },
  });

  const ticketComponentIds = (row: (typeof rows)[number]): number[] =>
    [...new Set([row.fk_component_id, ...row.maintenance_ticket_item.map((i) => i.fk_component_id)]
      .filter((id): id is number => id != null))];

  const componentIds = [...new Set(rows.flatMap(ticketComponentIds))];
  const componentMap: Record<number, any> = {};
  if (componentIds.length > 0) {
    const comps = await prisma.tool_component.findMany({
      where: { component_id: { in: componentIds } },
      select: { component_id: true, component_type: true, component_name: true, serial_number: true },
    });
    for (const c of comps) {
      componentMap[c.component_id] = c;
    }
  }

  const toolIdsWithoutComponent = [...new Set(
    rows.filter((r) => ticketComponentIds(r).length === 0).map((r) => r.fk_tool_id).filter(Boolean)
  )] as number[];
  type SystemComponent = { component_type: string; component_sn: string; is_drone: boolean };
  const systemComponentsMap: Record<number, SystemComponent[]> = {};
  if (toolIdsWithoutComponent.length > 0) {
    const sysComps = await prisma.tool_component.findMany({
      where: {
        fk_tool_id: { in: toolIdsWithoutComponent },
        component_active: 'Y',
      },
      select: { fk_tool_id: true, component_type: true, component_name: true, serial_number: true },
    });
    for (const c of sysComps) {
      if (!systemComponentsMap[c.fk_tool_id]) systemComponentsMap[c.fk_tool_id] = [];
      systemComponentsMap[c.fk_tool_id].push({
        component_type: c.component_type ?? c.component_name ?? '',
        component_sn: c.serial_number ?? '',
        is_drone: c.component_type === 'DRONE',
      });
    }
  }

  return rows.map((row) => {
    const assignee = row.users_maintenance_ticket_assigned_to_user_idTousers;
    const linkedComps = ticketComponentIds(row).map((id) => componentMap[id]).filter(Boolean);
    const comp = linkedComps.length === 1 ? linkedComps[0] : null;
    const entityName = comp ? (comp.component_type ?? comp.component_name ?? undefined) : undefined;
    const systemComponents = linkedComps.length > 1
      ? linkedComps.map((c) => ({ component_type: c.component_type ?? c.component_name ?? '', component_sn: c.serial_number ?? '' }))
      : !comp
        ? (systemComponentsMap[row.fk_tool_id ?? 0] ?? [])
            .map(({ component_type, component_sn }) => ({ component_type, component_sn }))
        : [];

    return {
      ticket_id:           row.ticket_id,
      fk_owner_id:         row.fk_owner_id ?? 0,
      fk_tool_id:          row.fk_tool_id ?? 0,
      fk_component_id:     row.fk_component_id ?? null,
      ticket_type:         (row.ticket_type ?? 'STANDARD') as MaintenanceTicket['ticket_type'],
      entity_type:         linkedComps.length > 0 ? 'COMPONENT' as const : 'AIRCRAFT' as const,
      ticket_status:       (row.ticket_status ?? 'OPEN') as MaintenanceTicket['ticket_status'],
      ticket_priority:     (row.ticket_priority ?? 'MEDIUM') as MaintenanceTicket['ticket_priority'],
      assigned_to_user_id: row.assigned_to_user_id ?? null,
      opened_by:           'system',
      opened_at:           row.reported_at?.toISOString() ?? row.created_at?.toISOString() ?? null,
      closed_at:           row.closed_at?.toISOString() ?? null,
      note:                row.resolution_notes ?? null,
      created_at:          row.created_at?.toISOString() ?? null,
      updated_at:          row.updated_at?.toISOString() ?? null,
      drone_code:          row.tool?.tool_code ?? '—',
      drone_serial:        row.tool?.tool_name ?? '—',
      drone_model:         row.tool?.tool_model
        ? `${row.tool.tool_model.manufacturer ?? ''} ${row.tool.tool_model.model_name ?? ''}`.trim()
        : (row.tool?.tool_description ?? '—'),
      entity_name:         entityName,
      component_sn:        comp?.serial_number ?? null,
      system_components:   systemComponents,
      assigner_name:  assignee
        ? `${assignee.first_name ?? ''} ${assignee.last_name ?? ''}`.trim()
        : 'Unassigned',
      assigner_email:     assignee?.email ?? '',
      trigger_params:     null,
      location_latitude:       row.location_latitude != null ? Number(row.location_latitude) : null,
      location_longitude:      row.location_longitude != null ? Number(row.location_longitude) : null,
      location_pseudo_name:    row.location_pseudo_name ?? null,
      intervention_started_at: row.intervention_started_at?.toISOString() ?? null,
      intervention_ended_at:   row.intervention_ended_at?.toISOString() ?? null,
    } as MaintenanceTicket;
  });
}



export async function createTicket(payload: CreateTicketPayload): Promise<number> {
  const componentIds = [...new Set(payload.components ?? [])];
  const primaryComponentId = componentIds[0] ?? null;

  // One ticket per request; every selected component is linked through maintenance_ticket_item.
  const ticketRow = await prisma.maintenance_ticket.create({
    data: {
      fk_owner_id:         payload.fk_owner_id,
      fk_tool_id:          payload.fk_tool_id,
      fk_component_id:     primaryComponentId,
      ticket_title:        primaryComponentId
        ? `Component Maintenance - #${componentIds.join(', #')}`
        : `Maintenance - System #${payload.fk_tool_id}`,
      ticket_type:         payload.type,
      ticket_priority:     payload.priority,
      ticket_status:       'OPEN',
      reported_by_user_id: payload.fk_user_id,
      assigned_to_user_id: payload.assigned_to || null,
      resolution_notes:    payload.note ?? null,
      reported_at:         new Date(),
      location_latitude:   payload.latitude  ?? null,
      location_longitude:  payload.longitude ?? null,
      location_pseudo_name: payload.location_pseudo_name ?? null,
      ...(componentIds.length > 0 && {
        maintenance_ticket_item: {
          create: componentIds.map((id) => ({
            fk_component_id:  id,
            item_description: `Component #${id}`,
            item_type:        'COMPONENT',
          })),
        },
      }),
    },
    select: { ticket_id: true },
  });
  const created = [ticketRow];

  const reporter = payload.reporter_name ?? `User #${payload.fk_user_id}`;
  const issueDetail = payload.note?.trim() ? `${payload.note.trim()}` : 'No description provided.';
  await Promise.all(
    created.map((row) =>
      addTicketEvent(row.ticket_id, 'CREATED', `Reported by ${reporter}: ${issueDetail}`, payload.reporter_email, payload.fk_user_id)
    )
  );

  const systemCode = await getToolName(payload.fk_tool_id);

  if (payload.assigned_to) {
    sendNotificationToUser(
      payload.assigned_to,
      `Maintenance Ticket Assigned — ${systemCode}`,
      `${reporter} opened a maintenance ticket on ${systemCode} and assigned it to you.${payload.note ? ` Note: ${payload.note}` : ''}`,
      '/systems/maintenance-tickets'
    ).catch(() => {});

    // Send module-based email notification to assigned user
    const techName = await getUserName(payload.assigned_to);
    sendTicketAssignedEmail(payload.fk_owner_id, {
      systemCode,
      technicianName: techName,
      ticketId: created[0].ticket_id,
      ticketTitle: payload.components?.length ? `Component Maintenance - #${payload.components[0]}` : `Maintenance - System #${payload.fk_tool_id}`,
      ticketType: payload.type || 'STANDARD',
      ticketPriority: payload.priority || 'MEDIUM',
      note: payload.note,
      assignedByName: payload.reporter_name,
    }, payload.assigned_to).catch(() => {});
  }

  sendNotificationToClientManagers(
    payload.fk_tool_id,
    payload.fk_owner_id,
    `New Maintenance Ticket — ${systemCode}`,
    `A new maintenance ticket was opened on ${systemCode} by ${reporter}.${payload.note ? ` Note: ${payload.note}` : ''}`,
    '/systems/maintenance-tickets'
  ).catch(() => {});

  // Send module-based email notification
  sendTicketCreatedEmail(payload.fk_owner_id, {
    systemCode,
    ticketId: created[0].ticket_id,
    ticketTitle: payload.components?.length ? `Component Maintenance - #${payload.components[0]}` : `Maintenance - System #${payload.fk_tool_id}`,
    note: payload.note,
  }).catch(() => {});

  return created[0].ticket_id;
}



export async function closeTicket(payload: CloseTicketPayload): Promise<{ resetComponents: { component_id: number; component_name: string | null }[] }> {
  const ticket = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: payload.ticket_id },
    select: {
      ticket_id: true,
      fk_tool_id: true,
      fk_component_id: true,
      ticket_status: true,
      fk_owner_id: true,
      reported_by_user_id: true,
      ticket_title: true,
      ticket_type: true,
    },
  });

  if (!ticket) throw new Error('Ticket not found');
  if (ticket.ticket_status === 'CLOSED') throw new Error('Ticket is already closed');

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];

  // Only the selected ticket is closed; other open tickets on the system (other components) stay open
  const openTickets = await prisma.maintenance_ticket.findMany({
    where: { ticket_id: payload.ticket_id },
    select: {
      ticket_id: true,
      fk_component_id: true,
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
      ticket_type: true,
      reported_by_user_id: true,
      ticket_title: true,
    },
  });

  await prisma.maintenance_ticket.updateMany({
    where: { ticket_id: payload.ticket_id },
    data: {
      ticket_status:    'CLOSED',
      closed_at:        now,
    },
  });

  await prisma.tool_maintenance.create({
    data: {
      fk_tool_id:              ticket.fk_tool_id!,
      maintenance_type:        ticket.ticket_type ?? 'STANDARD',
      maintenance_description: payload.note ?? 'Maintenance completed via ticket closure',
      completed_date:          new Date(todayDate),
      performed_by_user_id:    payload.closed_by ?? null,
      maintenance_status:      'COMPLETED',
      maintenance_notes:       payload.note ?? null,
    },
  });

  // Components explicitly named on the ticket(s) are reset. A system-level ticket (no component)
  // covers every component of the system, whatever the ticket type.
  const ticketedComponentIds = [...new Set(
    openTickets
      .flatMap((t) => [t.fk_component_id, ...t.maintenance_ticket_item.map((i) => i.fk_component_id)])
      .filter((id): id is number => id != null)
  )];
  const systemLevelTickets = openTickets.filter(
    (t) => t.fk_component_id == null && t.maintenance_ticket_item.length === 0
  );
  const systemComponentIds = systemLevelTickets.length
    ? await getSystemComponentIds(ticket.fk_tool_id!)
    : [];
  const resetComponentIds = [...new Set([...ticketedComponentIds, ...systemComponentIds])];

  for (const componentId of resetComponentIds) {
    await resetComponentCounters(ticket.fk_tool_id!, now.toISOString(), componentId, ticket.ticket_type ?? undefined);
  }
  const stillOpen = await prisma.maintenance_ticket.count({
    where: { fk_tool_id: ticket.fk_tool_id, ticket_status: { not: 'CLOSED' } },
  });
  if (stillOpen === 0) await setSystemOperationalStatus(ticket.fk_tool_id!, 'OPERATIONAL');
  await setComponentsOperationalStatus(resetComponentIds, 'OPERATIONAL');

  const resetComponents = resetComponentIds.length
    ? await prisma.tool_component.findMany({
        where: { component_id: { in: resetComponentIds } },
        select: { component_id: true, component_name: true },
        orderBy: { component_id: 'asc' },
      })
    : [];

  // Add close event to all tickets
  await Promise.all(
    openTickets.map((t) =>
      addTicketEvent(t.ticket_id, 'CLOSED', payload.note ?? 'Ticket closed')
    )
  );

  const systemCode = await getToolName(ticket.fk_tool_id!);
  const notifTitle = `Maintenance Complete — ${systemCode}`;
  const notifMsg = `Maintenance ticket closed. ${systemCode} is now operational.${payload.note ? ` Note: ${payload.note}` : ''}`;
  const actionUrl = '/systems/maintenance-tickets';

  // Notify all reporters of the closed tickets
  const reporterIds = [...new Set(openTickets.map((t) => t.reported_by_user_id).filter(Boolean))];
  for (const reporterId of reporterIds) {
    sendNotificationToUser(reporterId!, notifTitle, notifMsg, actionUrl).catch(() => {});
  }

  if (ticket.fk_tool_id && ticket.fk_owner_id) {
    sendNotificationToClientManagers(ticket.fk_tool_id, ticket.fk_owner_id, notifTitle, notifMsg, actionUrl).catch(() => {});
  }
  if (ticket.fk_owner_id) {
    sendNotificationToRoles(ticket.fk_owner_id, ['OPM'], notifTitle, notifMsg, actionUrl).catch(() => {});

    // Send module-based email notification
    sendModuleTicketClosedEmail(ticket.fk_owner_id, {
      systemCode,
      ticketId: payload.ticket_id,
      ticketTitle: ticket.ticket_title,
      note: payload.note,
    }).catch(() => {});
  }

  return { resetComponents };
}



export async function assignTicket(payload: AssignTicketPayload): Promise<void> {
  const ticket = await prisma.maintenance_ticket.update({
    where: { ticket_id: payload.ticket_id },
    data: { assigned_to_user_id: payload.assigned_to },
    select: { fk_tool_id: true, fk_owner_id: true, ticket_id: true, ticket_title: true, ticket_type: true },
  });

  const techName = payload.technician_name ?? `User #${payload.assigned_to}`;
  await addTicketEvent(
    payload.ticket_id,
    'ASSIGNED',
    `Ticket assigned to ${techName}`
  );

  if (ticket.fk_tool_id) {
    const systemCode = await getToolName(ticket.fk_tool_id);
    sendNotificationToUser(
      payload.assigned_to,
      `Maintenance Ticket Assigned — ${systemCode}`,
      `A maintenance ticket on ${systemCode} has been assigned to you.`,
      '/systems/maintenance-tickets'
    ).catch(() => {});

    if (ticket.fk_owner_id) {
      sendNotificationToClientManagers(
        ticket.fk_tool_id,
        ticket.fk_owner_id,
        `Maintenance Ticket Assigned — ${systemCode}`,
        `A maintenance ticket on ${systemCode} has been assigned to ${techName}.`,
        '/systems/maintenance-tickets'
      ).catch(() => {});

      // Send module-based email notification to assigned user
      sendTicketAssignedEmail(ticket.fk_owner_id, {
        systemCode,
        technicianName: techName,
        ticketId: ticket.ticket_id,
        ticketTitle: ticket.ticket_title || 'Untitled Ticket',
        ticketType: ticket.ticket_type || 'STANDARD',
        assignedByName: payload.assigned_by_name,
      }, payload.assigned_to).catch(() => {});
    }
  }
}

export async function getTicketAssignee(ticketId: number): Promise<number | null> {
  const row = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: ticketId },
    select: { assigned_to_user_id: true },
  });
  return row?.assigned_to_user_id ?? null;
}



export async function addReport(payload: AddReportPayload): Promise<void> {
  await prisma.maintenance_ticket_report.create({
    data: {
      fk_ticket_id:   payload.ticket_id,
      report_title:   'Intervention Report',
      report_content: payload.report_text,
      report_type:    'INTERVENTION',
      generated_at:   new Date(),
    },
  });

  await addTicketEvent(payload.ticket_id, 'REPORT_ADDED', payload.report_text.slice(0, 120), payload.reporter_email, payload.reporter_user_id);

  if (payload.close_report === 'Y') {
    await closeTicket({
      ticket_id: payload.ticket_id,
      note:      payload.report_text,
    });
  }
}



export async function getTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  const data = await prisma.maintenance_ticket_event.findMany({
    where: { fk_ticket_id: ticketId },
    select: {
      event_id: true,
      event_type: true,
      event_description: true,
      event_data: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return data.map((row) => ({
    event_id:      row.event_id,
    fk_ticket_id:  ticketId,
    event_type:    row.event_type,
    event_message: row.event_description ?? '',
    created_by:    (row.event_data as any)?.email ?? null,
    created_at:    row.created_at?.toISOString() ?? '',
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

  await prisma.ticket_attachment.create({
    data: {
      fk_ticket_id:        ticketId,
      file_name:           file.name,
      file_key:            fileKey,
      file_type:           file.type || 'application/octet-stream',
      file_size:           BigInt(file.size),
      file_description:    description || null,
      s3_region:           REGION,
      s3_url:              s3Url,
      uploaded_by:         uploadedBy,
      uploaded_by_user_id: uploadedByUserId ?? null,
      uploaded_at:         new Date(),
    },
  });

  await addTicketEvent(ticketId, 'ATTACHMENT_ADDED', `File uploaded: ${file.name}`);

  return { file_key: fileKey, s3_url: s3Url };
}

export async function getTicketAttachments(ticketId: number) {
  const data = await prisma.ticket_attachment.findMany({
    where: { fk_ticket_id: ticketId },
    orderBy: { uploaded_at: 'desc' },
  });

  return Promise.all(
    data.map(async (row) => ({
      ...row,
      file_size: row.file_size != null ? Number(row.file_size) : null,
      uploaded_at: row.uploaded_at?.toISOString() ?? null,
      download_url: await getPresignedDownloadUrl(row.file_key, 900),
    }))
  );
}

export async function deleteAttachment(attachmentId: number): Promise<void> {
  const data = await prisma.ticket_attachment.findUnique({
    where: { attachment_id: attachmentId },
    select: { file_key: true, fk_ticket_id: true, file_name: true },
  });

  if (!data) throw new Error('Attachment not found');

  await deleteFileFromS3(data.file_key);

  await prisma.ticket_attachment.delete({ where: { attachment_id: attachmentId } });

  await addTicketEvent(data.fk_ticket_id, 'ATTACHMENT_DELETED', `File deleted: ${data.file_name}`);
}



export async function getDroneList(ownerId: number): Promise<DroneOption[]> {
  const data = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    select: { tool_id: true, tool_code: true, tool_name: true, tool_description: true, tool_metadata: true },
    orderBy: { tool_code: 'asc' },
  });

  return data
    .filter((row) => (row.tool_metadata as any)?.is_warehouse !== true && (row.tool_metadata as any)?.deleted !== true)
    .map((row) => ({
      tool_id:     row.tool_id,
      tool_code:   row.tool_code ?? '',
      tool_desc:   row.tool_description ?? row.tool_name ?? '',
      tool_status: (row.tool_metadata as any)?.status ?? 'OPERATIONAL',
    }));
}

export async function getComponentList(toolId: number, ticketType?: string): Promise<ComponentOption[]> {
  await refreshMaintenanceDaysForTool(toolId);

  const { data, error } = await supabase
    .from('tool_component')
    .select('component_id, component_code, component_name, component_type, serial_number, maintenance_cycle, maintenance_cycle_day')
    .eq('fk_tool_id', toolId)
    .eq('component_active', 'Y');

  if (error) throw new Error(`getComponentList: ${error.message}`);

  return (data ?? []).map((row) => ({
    tool_component_id: row.component_id,
    component_code:    row.component_code ?? '',
    component_type:    row.component_type ?? row.component_name ?? '',
    component_sn:      row.serial_number ?? '',
  }));
}

export async function getUserList(ownerId: number, profileCode?: string): Promise<UserOption[]> {
  const data = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: 'Y',
      ...(profileCode && profileCode !== 'ALL' && { user_role: profileCode }),
    },
    select: { user_id: true, first_name: true, last_name: true, email: true, user_role: true },
    orderBy: { first_name: 'asc' },
  });

  return data.map((row) => ({
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
  await prisma.maintenance_ticket_event.create({
    data: {
      fk_ticket_id:       ticketId,
      event_type:         eventType,
      event_description:  message,
      created_by_user_id: createdByUserId ?? null,
      event_data:         createdByEmail ? ({ email: createdByEmail } as Prisma.InputJsonValue) : Prisma.JsonNull,
      created_at:         new Date(),
    },
  });
}

export async function getToolCode(toolId: number): Promise<string> {
  return getToolName(toolId);
}

export async function getTechnicianName(userId: number): Promise<string> {
  return getUserName(userId);
}

export async function setSystemOperationalStatus(toolId: number, status: string): Promise<void> {
  const tool = await prisma.tool.findUnique({
    where: { tool_id: toolId },
    select: { tool_metadata: true },
  });

  await prisma.tool.update({
    where: { tool_id: toolId },
    data: {
      tool_metadata: {
        ...(tool?.tool_metadata as Record<string, unknown> ?? {}),
        status,
      } as Prisma.InputJsonValue,
    },
  });
}

export async function setComponentsOperationalStatus(componentIds: number[], status: string): Promise<void> {
  if (!componentIds.length) return;
  const comps = await prisma.tool_component.findMany({
    where: { component_id: { in: componentIds } },
    select: { component_id: true, component_metadata: true },
  });

  await prisma.$transaction(
    comps.map((comp) =>
      prisma.tool_component.update({
        where: { component_id: comp.component_id },
        data: {
          component_metadata: {
            ...(comp.component_metadata as Record<string, unknown> ?? {}),
            component_status: status,
          } as Prisma.InputJsonValue,
        },
      })
    )
  );
}

async function getSystemComponentIds(toolId: number): Promise<number[]> {
  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
    },
    select: { component_id: true, component_metadata: true },
  });
  // Detached or decommissioned components are no longer part of the system.
  return components
    .filter((c) => {
      const meta = (c.component_metadata ?? {}) as Record<string, unknown>;
      return meta.system_detached !== true && meta.component_status !== 'DECOMMISSIONED';
    })
    .map((c) => c.component_id);
}

async function resetComponentCounters(
  toolId: number,
  resetAt: string,
  componentId?: number | null,
  ticketType?: string,
): Promise<void> {
  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
      ...(componentId ? { component_id: componentId } : {}),
    },
    select: {
      component_id: true,
      maintenance_cycle: true,
      maintenance_cycle_hour: true,
      maintenance_cycle_day: true,
      maintenance_cycle_flight: true,
    },
  });

  if (!components.length) return;

  // A component named on a closed ticket has maintenance performed on it, so its last-maintenance
  // date is stamped and every maintenance counter restarts from zero, regardless of whether a
  // cycle type or limit was ever configured for it.
  const updates = components.map((comp) =>
    prisma.tool_component.update({
      where: { component_id: comp.component_id },
      data: {
        last_maintenance_date: new Date(resetAt),
        current_maintenance_hours: 0,
        current_maintenance_flights: 0,
        current_maintenance_days: 0,
      },
    })
  );

  await prisma.$transaction(updates);
}

export async function getComponentMissions(componentId: number) {
  const comp = await prisma.tool_component.findUnique({
    where: { component_id: componentId },
    select: { fk_tool_id: true, installation_date: true, created_at: true },
  });

  if (!comp?.fk_tool_id) return [];

  const installDate = comp.installation_date?.toISOString().slice(0, 10) ?? new Date().toISOString().split('T')[0];
  const createdDate = comp.created_at?.toISOString().split('T')[0] ?? null;
  const cutoff = createdDate && createdDate > installDate ? createdDate : installDate;

  const data = await prisma.pilot_mission.findMany({
    where: {
      fk_tool_id: comp.fk_tool_id,
      actual_end: { not: null },
      actual_start: { gte: new Date(cutoff) },
    },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      actual_start: true,
      actual_end: true,
      flight_duration: true,
      distance_flown: true,
    },
    orderBy: { actual_start: 'desc' },
  });

  return data.map((row) => ({
    pilot_mission_id: row.pilot_mission_id,
    mission_code:     row.mission_code,
    actual_start:     row.actual_start?.toISOString() ?? null,
    actual_end:       row.actual_end?.toISOString() ?? null,
    flight_duration:  row.flight_duration,
    distance_flown:   row.distance_flown != null ? Number(row.distance_flown) : null,
  }));
}

export async function getComponentTicketEvents(componentId: number) {
  const data = await prisma.maintenance_ticket.findMany({
    where: {
      OR: [
        { fk_component_id: componentId },
        { maintenance_ticket_item: { some: { fk_component_id: componentId, item_type: 'COMPONENT' } } },
      ],
    },
    select: {
      ticket_id: true,
      ticket_status: true,
      reported_at: true,
      closed_at: true,
      resolution_notes: true,
      maintenance_ticket_event: {
        select: {
          event_id: true,
          event_type: true,
          event_description: true,
          created_at: true,
        },
      },
    },
    orderBy: { ticket_id: 'desc' },
  });

  return data.map((row) => ({
    ...row,
    reported_at: row.reported_at?.toISOString() ?? null,
    closed_at:   row.closed_at?.toISOString() ?? null,
    maintenance_ticket_event: row.maintenance_ticket_event.map((e) => ({
      ...e,
      created_at: e.created_at?.toISOString() ?? null,
    })),
  }));
}

export async function startIntervention(ticketId: number, userId: number, userEmail: string): Promise<void> {
  const ticket = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: ticketId },
    select: { 
      assigned_to_user_id: true, 
      ticket_status: true, 
      intervention_started_at: true, 
      fk_tool_id: true, 
      fk_owner_id: true,
      ticket_title: true,
      ticket_type: true,
      ticket_priority: true,
    },
  });

  if (!ticket) throw new Error('Ticket not found');
  if (ticket.ticket_status === 'CLOSED') throw new Error('Cannot start intervention on a closed ticket');
  if (ticket.intervention_started_at) throw new Error('Intervention already started for this ticket');

  await prisma.maintenance_ticket.update({
    where: { ticket_id: ticketId },
    data: {
      intervention_started_at: new Date(),
      intervention_started_by: userId,
      ticket_status: 'IN_PROGRESS',
      updated_at: new Date(),
    },
  });

  await addTicketEvent(ticketId, 'INTERVENTION_STARTED', 'Technician started intervention', userEmail, userId);

  if (ticket.fk_tool_id && ticket.fk_owner_id) {
    const systemCode = await getToolName(ticket.fk_tool_id);
    const technicianName = ticket.assigned_to_user_id ? await getUserName(ticket.assigned_to_user_id) : 'Unknown Technician';
    const startTime = new Date().toLocaleString();

    sendNotificationToClientManagers(
      ticket.fk_tool_id,
      ticket.fk_owner_id,
      `Maintenance In Progress — ${systemCode}`,
      `Maintenance intervention on ${systemCode} has started.`,
      '/systems/maintenance-tickets'
    ).catch(() => {});

    // Send module-based email notification
    sendInterventionStartedEmail(ticket.fk_owner_id, {
      systemCode,
      ticketTitle: ticket.ticket_title || 'Untitled Ticket',
      ticketId,
      technicianName,
      startTime,
      ticketType: ticket.ticket_type!!,
      ticketPriority: ticket.ticket_priority!!,
    }).catch(() => {});
  }
}

export async function endIntervention(ticketId: number, userId: number, userEmail: string): Promise<void> {
  const ticket = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: ticketId },
    select: { 
      assigned_to_user_id: true, 
      ticket_status: true, 
      intervention_started_at: true, 
      intervention_ended_at: true, 
      fk_tool_id: true, 
      fk_owner_id: true,
      ticket_title: true,
      ticket_type: true,
      ticket_priority: true,
    },
  });

  if (!ticket) throw new Error('Ticket not found');
  if (ticket.ticket_status === 'CLOSED') throw new Error('Cannot end intervention on a closed ticket');
  if (!ticket.intervention_started_at) throw new Error('Intervention has not been started yet');
  if (ticket.intervention_ended_at) throw new Error('Intervention already ended for this ticket');

  await prisma.maintenance_ticket.update({
    where: { ticket_id: ticketId },
    data: {
      intervention_ended_at: new Date(),
      ticket_status: 'OPEN',
      updated_at: new Date(),
    },
  });

  await addTicketEvent(ticketId, 'INTERVENTION_ENDED', 'Technician ended intervention', userEmail, userId);

  if (ticket.fk_tool_id && ticket.fk_owner_id) {
    const systemCode = await getToolName(ticket.fk_tool_id);
    const technicianName = ticket.assigned_to_user_id ? await getUserName(ticket.assigned_to_user_id) : 'Unknown Technician';
    const endTime = new Date().toLocaleString();

    sendNotificationToClientManagers(
      ticket.fk_tool_id,
      ticket.fk_owner_id,
      `Maintenance Intervention Ended — ${systemCode}`,
      `Maintenance intervention on ${systemCode} has ended and awaits closure.`,
      '/systems/maintenance-tickets'
    ).catch(() => {});

    // Send module-based email notification
    sendInterventionEndedEmail(ticket.fk_owner_id, {
      systemCode,
      ticketTitle: ticket.ticket_title || 'Untitled Ticket',
      ticketId,
      technicianName,
      ticketType: ticket.ticket_type || 'null',
      ticketPriority: ticket.ticket_priority || 'null',
    }).catch(() => {});
  }
}
