'use server';

/**
 * Maintenance ticket WORKFLOW (writes): create, assign, intervention start/end, report, close, attachments.
 *
 * Supporting code lives next to this file:
 *   maintenance-ticket-rules.ts          pure rules (coverage conflicts, which components reset, titles)
 *   maintenance-ticket-guards.ts         assert* / hasOpenTicketForTool checks
 *   maintenance-ticket-components.ts     counter reset + operational status on close
 *   maintenance-ticket-notifications.ts  in-app notifications + emails
 *   maintenance-ticket-events.ts         ticket timeline entries
 *   maintenance-ticket-queries.ts        read-only queries and lookup lists
 */

import type {
  AddReportPayload,
  AssignTicketPayload,
  CloseTicketPayload,
  CreateTicketPayload,
} from '@/config/types/maintenance';
import { prisma } from '@/lib/prisma';
import {
  REGION,
  buildS3Key,
  buildS3Url,
  deleteFileFromS3,
  uploadFileToS3,
} from '@/lib/s3Client';
import { addTicketEvent } from './maintenance-ticket-events';
import { assertComponentsBelongToTool, assertComponentsTicketable, assertSystemCanCloseTicket } from './maintenance-ticket-guards';
import {
  excludePermanentlyBlocked,
  getSystemComponentIds,
  getTicketableComponentIds,
  resetComponentCounters,
  setComponentsOperationalStatus,
  setSystemOperationalStatus,
  settleBlockedMaintenanceComponents,
} from './maintenance-ticket-components';
import {
  notifyInterventionEnded,
  notifyInterventionStarted,
  notifyTicketAssigned,
  notifyTicketClosed,
  notifyTicketCreated,
} from './maintenance-ticket-notifications';
import {
  buildTicketTitle,
  getTicketedComponentIds,
  hasSystemLevelTicket,
  mergeResetComponentIds,
} from './maintenance-ticket-rules';


export async function createTicket(payload: CreateTicketPayload): Promise<number> {
  const componentIds = [...new Set(payload.components ?? [])];
  const primaryComponentId = componentIds[0] ?? null;

  await assertComponentsBelongToTool(payload.fk_tool_id, componentIds);
  await assertComponentsTicketable(payload.fk_tool_id, componentIds);

  // A system-level ticket (no component picked) covers the components that are eligible NOW.
  // They are recorded on the ticket so a later status change cannot add or remove components.
  const coveredIds = componentIds.length
    ? componentIds
    : await getTicketableComponentIds(payload.fk_tool_id);

  // One ticket per request; every covered component is linked through maintenance_ticket_item.
  const ticketRow = await prisma.maintenance_ticket.create({
    data: {
      fk_owner_id:         payload.fk_owner_id,
      fk_tool_id:          payload.fk_tool_id,
      fk_component_id:     componentIds.length ? primaryComponentId : null,
      ticket_title:        buildTicketTitle(payload.fk_tool_id, componentIds),
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
      ...(coveredIds.length > 0 && {
        maintenance_ticket_item: {
          create: coveredIds.map((id) => ({
            fk_component_id:  id,
            item_description: `Component #${id}`,
            item_type:        'COMPONENT',
          })),
        },
      }),
    },
    select: { ticket_id: true },
  });

  const reporter = payload.reporter_name ?? `User #${payload.fk_user_id}`;
  const issueDetail = payload.note?.trim() ? `${payload.note.trim()}` : 'No description provided.';
  await addTicketEvent(
    ticketRow.ticket_id,
    'CREATED',
    `Reported by ${reporter}: ${issueDetail}`,
    payload.reporter_email,
    payload.fk_user_id
  );

  await notifyTicketCreated(payload, ticketRow.ticket_id, reporter);

  return ticketRow.ticket_id;
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
  await assertSystemCanCloseTicket(ticket.fk_tool_id!);

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];

  // Only the selected ticket is closed; other open tickets on the system (other components) stay open
  const closingTickets = await prisma.maintenance_ticket.findMany({
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
  const systemComponentIds = hasSystemLevelTicket(closingTickets)
    ? await getSystemComponentIds(ticket.fk_tool_id!)
    : [];
  const resetComponentIds = await excludePermanentlyBlocked(
    ticket.fk_tool_id!,
    mergeResetComponentIds(getTicketedComponentIds(closingTickets), systemComponentIds),
  );

  for (const componentId of resetComponentIds) {
    await resetComponentCounters(ticket.fk_tool_id!, now.toISOString(), componentId);
  }
  const stillOpen = await prisma.maintenance_ticket.count({
    where: { fk_tool_id: ticket.fk_tool_id, ticket_status: { not: 'CLOSED' } },
  });
  if (stillOpen === 0) await setSystemOperationalStatus(ticket.fk_tool_id!, 'OPERATIONAL');
  await setComponentsOperationalStatus(resetComponentIds, 'OPERATIONAL');
  await settleBlockedMaintenanceComponents(ticket.fk_tool_id!);

  const resetComponents = resetComponentIds.length
    ? await prisma.tool_component.findMany({
        where: { component_id: { in: resetComponentIds } },
        select: { component_id: true, component_name: true },
        orderBy: { component_id: 'asc' },
      })
    : [];

  // Add close event to all tickets
  await Promise.all(
    closingTickets.map((t) =>
      addTicketEvent(t.ticket_id, 'CLOSED', payload.note ?? 'Ticket closed', payload.closed_by_email, payload.closed_by)
    )
  );

  await notifyTicketClosed({
    ticketId: payload.ticket_id,
    ticketTitle: ticket.ticket_title,
    toolId: ticket.fk_tool_id,
    ownerId: ticket.fk_owner_id,
    reporterUserIds: closingTickets.map((t) => t.reported_by_user_id),
    note: payload.note,
  });

  return { resetComponents };
}



export async function assignTicket(payload: AssignTicketPayload): Promise<void> {
  const existing = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: payload.ticket_id },
    select: { ticket_status: true },
  });
  if (!existing) throw new Error('Ticket not found');
  if (existing.ticket_status === 'CLOSED') throw new Error('Cannot assign a closed ticket');

  const ticket = await prisma.maintenance_ticket.update({
    where: { ticket_id: payload.ticket_id },
    data: { assigned_to_user_id: payload.assigned_to },
    select: { fk_tool_id: true, fk_owner_id: true, ticket_id: true, ticket_title: true, ticket_type: true },
  });

  const techName = payload.technician_name ?? `User #${payload.assigned_to}`;
  await addTicketEvent(
    payload.ticket_id,
    'ASSIGNED',
    `Ticket assigned to ${techName}`,
    payload.assigned_by_email,
    payload.assigned_by_user_id
  );

  await notifyTicketAssigned(ticket, payload, techName);
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

  await notifyInterventionStarted(ticketId, ticket);
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

  await notifyInterventionEnded(ticketId, ticket);
}
