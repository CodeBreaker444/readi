/**
 * In-app notifications + module emails for maintenance ticket events.
 * Every send is fire-and-forget (errors swallowed) so a notification problem never fails the ticket action.
 * Workflow code lives in maintenance-ticket.ts.
 */
import { sendNotificationToClientManagers, sendNotificationToRoles, sendNotificationToUser } from '@/backend/services/notification/notification-service';
import {
  sendTicketCreatedEmail,
  sendTicketClosedEmail as sendModuleTicketClosedEmail,
  sendTicketAssignedEmail,
  sendInterventionStartedEmail,
  sendInterventionEndedEmail,
} from '@/backend/services/settings/module-email-notification-service';
import { getToolName, getUserName } from '@/backend/services/shared/entity-names';
import type { AssignTicketPayload, CreateTicketPayload } from '@/config/types/maintenance';
import { buildTicketEmailTitle } from './maintenance-ticket-rules';

const TICKETS_URL = '/systems/maintenance-tickets';

export async function notifyTicketCreated(
  payload: CreateTicketPayload,
  ticketId: number,
  reporter: string
): Promise<void> {
  const systemCode = await getToolName(payload.fk_tool_id);
  const emailTitle = buildTicketEmailTitle(payload.fk_tool_id, payload.components);

  if (payload.assigned_to) {
    sendNotificationToUser(
      payload.assigned_to,
      `Maintenance Ticket Assigned — ${systemCode}`,
      `${reporter} opened a maintenance ticket on ${systemCode} and assigned it to you.${payload.note ? ` Note: ${payload.note}` : ''}`,
      TICKETS_URL
    ).catch(() => {});

    // Send module-based email notification to assigned user
    const techName = await getUserName(payload.assigned_to);
    sendTicketAssignedEmail(payload.fk_owner_id, {
      systemCode,
      technicianName: techName,
      ticketId,
      ticketTitle: emailTitle,
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
    TICKETS_URL
  ).catch(() => {});

  // Send module-based email notification
  sendTicketCreatedEmail(payload.fk_owner_id, {
    systemCode,
    ticketId,
    ticketTitle: emailTitle,
    note: payload.note,
  }).catch(() => {});
}

export async function notifyTicketClosed(args: {
  ticketId: number;
  ticketTitle: string | null;
  toolId: number | null;
  ownerId: number | null;
  reporterUserIds: (number | null)[];
  note?: string;
}): Promise<void> {
  const systemCode = await getToolName(args.toolId!);
  const notifTitle = `Maintenance Complete — ${systemCode}`;
  const notifMsg = `Maintenance ticket closed. ${systemCode} is now operational.${args.note ? ` Note: ${args.note}` : ''}`;

  // Notify all reporters of the closed tickets
  const reporterIds = [...new Set(args.reporterUserIds.filter(Boolean))];
  for (const reporterId of reporterIds) {
    sendNotificationToUser(reporterId!, notifTitle, notifMsg, TICKETS_URL).catch(() => {});
  }

  if (args.toolId && args.ownerId) {
    sendNotificationToClientManagers(args.toolId, args.ownerId, notifTitle, notifMsg, TICKETS_URL).catch(() => {});
  }
  if (args.ownerId) {
    sendNotificationToRoles(args.ownerId, ['OPM'], notifTitle, notifMsg, TICKETS_URL).catch(() => {});

    // Send module-based email notification
    sendModuleTicketClosedEmail(args.ownerId, {
      systemCode,
      ticketId: args.ticketId,
      ticketTitle: args.ticketTitle ?? undefined,
      note: args.note,
    }).catch(() => {});
  }
}

export async function notifyTicketAssigned(
  ticket: {
    fk_tool_id: number | null;
    fk_owner_id: number | null;
    ticket_id: number;
    ticket_title: string | null;
    ticket_type: string | null;
  },
  payload: AssignTicketPayload,
  techName: string
): Promise<void> {
  if (!ticket.fk_tool_id) return;

  const systemCode = await getToolName(ticket.fk_tool_id);
  sendNotificationToUser(
    payload.assigned_to,
    `Maintenance Ticket Assigned — ${systemCode}`,
    `A maintenance ticket on ${systemCode} has been assigned to you.`,
    TICKETS_URL
  ).catch(() => {});

  if (ticket.fk_owner_id) {
    sendNotificationToClientManagers(
      ticket.fk_tool_id,
      ticket.fk_owner_id,
      `Maintenance Ticket Assigned — ${systemCode}`,
      `A maintenance ticket on ${systemCode} has been assigned to ${techName}.`,
      TICKETS_URL
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

interface InterventionTicket {
  assigned_to_user_id: number | null;
  fk_tool_id: number | null;
  fk_owner_id: number | null;
  ticket_title: string | null;
  ticket_type: string | null;
  ticket_priority: string | null;
}

export async function notifyInterventionStarted(ticketId: number, ticket: InterventionTicket): Promise<void> {
  if (!(ticket.fk_tool_id && ticket.fk_owner_id)) return;

  const systemCode = await getToolName(ticket.fk_tool_id);
  const technicianName = ticket.assigned_to_user_id ? await getUserName(ticket.assigned_to_user_id) : 'Unknown Technician';
  const startTime = new Date().toLocaleString();

  sendNotificationToClientManagers(
    ticket.fk_tool_id,
    ticket.fk_owner_id,
    `Maintenance In Progress — ${systemCode}`,
    `Maintenance intervention on ${systemCode} has started.`,
    TICKETS_URL
  ).catch(() => {});

  // Send module-based email notification
  sendInterventionStartedEmail(ticket.fk_owner_id, {
    systemCode,
    ticketTitle: ticket.ticket_title || 'Untitled Ticket',
    ticketId,
    technicianName,
    startTime,
    ticketType: ticket.ticket_type!,
    ticketPriority: ticket.ticket_priority!,
  }).catch(() => {});
}

export async function notifyInterventionEnded(ticketId: number, ticket: InterventionTicket): Promise<void> {
  if (!(ticket.fk_tool_id && ticket.fk_owner_id)) return;

  const systemCode = await getToolName(ticket.fk_tool_id);
  const technicianName = ticket.assigned_to_user_id ? await getUserName(ticket.assigned_to_user_id) : 'Unknown Technician';

  sendNotificationToClientManagers(
    ticket.fk_tool_id,
    ticket.fk_owner_id,
    `Maintenance Intervention Ended — ${systemCode}`,
    `Maintenance intervention on ${systemCode} has ended and awaits closure.`,
    TICKETS_URL
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
