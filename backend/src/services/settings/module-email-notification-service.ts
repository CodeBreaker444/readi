import { prisma } from "@/lib/prisma";
import {
  sendMissionCreatedEmail,
  sendMissionAssignedEmail,
  sendMissionStartedEmail,
  sendMissionCompletedEmail,
  sendCalendarEventCreatedEmail,
  sendCalendarEventUpdatedEmail,
  sendTicketCreatedEmail as sendTicketCreatedEmailTemplate,
  sendTicketAssignedEmail as sendTicketAssignedEmailTemplate,
  sendTicketClosedEmail as sendTicketClosedEmailTemplate,
  sendInterventionStartedEmail as sendInterventionStartedEmailTemplate,
  sendInterventionEndedEmail as sendInterventionEndedEmailTemplate,
  sendMaintenanceAlertEmail as sendMaintenanceAlertEmailTemplate,
  sendMaintenanceDueEmail as sendMaintenanceDueEmailTemplate,
  sendTrainingCreatedEmail as sendTrainingCreatedEmailTemplate,
  sendTrainingUpdatedEmail as sendTrainingUpdatedEmailTemplate,
  sendTrainingDeletedEmail as sendTrainingDeletedEmailTemplate,
  sendTrainingCertificationExpiringEmail as sendTrainingCertificationExpiringEmailTemplate,
} from "../../../../lib/resend/mail";
import { isDailyEmailLimitReached, incrementDailyEmailCount } from "@/backend/services/email/email-limit-service";
import { isModuleEventEmailEnabled } from "./module-email-config";
import { dispatchModuleEmail, EmailTemplateFn } from "./module-email-dispatch";

/**
 * Typed module email senders (maintenance / operations / training).
 *
 * Config + recipients: module-email-config.ts   (re-exported below for existing importers)
 * Limit / counter / admin warning: module-email-dispatch.ts
 */
export {
  isModuleEventEmailEnabled,
  getModuleEmailConfig,
  getAllModuleEmailConfigs,
  getModuleEmailConfigs,
  updateModuleEmailConfig,
} from "./module-email-config";
export type { ModuleEmailNotificationConfig } from "./module-email-config";

export interface MaintenanceEmailData {
  systemCode: string;
  ticketId?: number;
  ticketTitle?: string;
  ticketType?: string;
  ticketPriority?: string;
  componentName?: string;
  status?: 'ALERT' | 'DUE';
  triggers?: string[];
  note?: string | null;
  technicianName?: string;
  assignedByName?: string;
  startTime?: string;
}

export interface MissionEmailData {
  missionCode: string;
  missionType: string;
  createdBy?: string;
  assignedBy?: string;
  assignedTo?: string;
  role?: 'Pilot' | 'Observer';
  startedBy?: string;
  completedBy?: string;
  scheduledDate?: string | null;
  startTime?: string;
  completionTime?: string;
  duration?: string;
  pilot?: string;
  notes?: string;
  description?: string;
}

export interface CalendarEventData {
  eventTitle: string;
  eventType: string;
  createdBy?: string;
  updatedBy?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  description?: string;
  changes?: string[];
}

export interface TrainingEmailData {
  trainingName: string;
  trainingType?: string | null;
  certificateType?: string | null;
  sessionDate?: string | null;
  attendeeCount?: number;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
  userName?: string | null;
  expiryDate?: string;
  daysRemaining?: number;
  /** user_id of the training/course owner (training.trainer_user_id) — also notified when set */
  courseOwnerUserId?: number | null;
}

/**
 * Send maintenance module email notification
 */
async function sendMaintenanceModuleEmail(
  ownerId: number,
  eventType: string,
  emailFn: EmailTemplateFn,
  ...emailArgs: any[]
): Promise<void> {
  await dispatchModuleEmail(ownerId, 'maintenance', eventType, emailFn, emailArgs);
}

/**
 * Send maintenance alert email
 */
export async function sendMaintenanceAlertEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'maintenance_alert',
    sendMaintenanceAlertEmailTemplate,
    data.systemCode,
    data.componentName || 'Unknown Component',
    data.status || 'ALERT',
    data.triggers || []
  );
}

/**
 * Send maintenance due email
 */
export async function sendMaintenanceDueEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'maintenance_due',
    sendMaintenanceDueEmailTemplate,
    data.systemCode,
    data.componentName || 'Unknown Component',
    data.triggers || []
  );
}

/**
 * Send ticket created email
 */
export async function sendTicketCreatedEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'ticket_created',
    sendTicketCreatedEmailTemplate,
    data.systemCode,
    data.ticketTitle || 'Untitled Ticket',
    data.ticketId || 0,
    data.technicianName,
    data.note
  );
}

/**
 * Send ticket closed email
 */
export async function sendTicketClosedEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'ticket_closed',
    sendTicketClosedEmailTemplate,
    data.systemCode,
    data.ticketTitle || 'Untitled Ticket',
    data.ticketId || 0,
    data.note
  );
}

/**
 * Send ticket assigned email directly to assigned user
 */
export async function sendTicketAssignedEmail(
  ownerId: number,
  data: MaintenanceEmailData,
  assignedUserId?: number
): Promise<void> {
  // Check if ticket assigned email is enabled
  const isEnabled = await isModuleEventEmailEnabled(ownerId, 'maintenance', 'ticket_assigned');
  if (!isEnabled) {
    console.log('[sendTicketAssignedEmail] Ticket assigned email is disabled for owner:', ownerId);
    return;
  }

  // If specific user ID is provided, send directly to them
  if (assignedUserId) {
    const user = await prisma.public_users.findUnique({
      where: { user_id: assignedUserId },
      select: { user_id: true, email: true },
    });

    if (!user?.email) {
      console.log('[sendTicketAssignedEmail] No valid email found for assigned user ID:', assignedUserId);
      return;
    }

    // Check daily email limit
    const limitReached = await isDailyEmailLimitReached(ownerId);
    if (limitReached) {
      console.log('[sendTicketAssignedEmail] Daily email limit reached for owner:', ownerId);
      return;
    }

    try {
      await sendTicketAssignedEmailTemplate(
        [user.email],
        data.systemCode,
        data.ticketTitle || 'Untitled Ticket',
        data.ticketId || 0,
        data.technicianName || 'Unknown Technician',
        data.assignedByName || 'System',
        data.note ||'No description provided',
        data.ticketType,
        data.ticketPriority
      );
      await incrementDailyEmailCount(ownerId);
      // console.log('[sendTicketAssignedEmail] Email sent successfully to assigned user');
    } catch (error) {
      console.error('[sendTicketAssignedEmail] Failed to send email:', error);
    }
  } else {
    // Fallback to role-based sending if no specific user ID provided
    await sendMaintenanceModuleEmail(
      ownerId,
      'ticket_assigned',
      sendTicketAssignedEmailTemplate,
      data.systemCode,
      data.ticketTitle || 'Untitled Ticket',
      data.ticketId || 0,
      data.technicianName || 'Unknown Technician',
      data.assignedByName || 'System',
      data.note,
      data.ticketType,
      data.ticketPriority
    );
  }
}

/**
 * Send intervention started email
 */
export async function sendInterventionStartedEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'intervention_started',
    sendInterventionStartedEmailTemplate,
    data.systemCode,
    data.ticketTitle || 'Untitled Ticket',
    data.ticketId || 0,
    data.technicianName || 'Unknown Technician',
    undefined, // startTime
    data.note,
    data.ticketType,
    data.ticketPriority
  );
}

/**
 * Send intervention ended email
 */
export async function sendInterventionEndedEmail(
  ownerId: number,
  data: MaintenanceEmailData
): Promise<void> {
  await sendMaintenanceModuleEmail(
    ownerId,
    'intervention_ended',
    sendInterventionEndedEmailTemplate,
    data.systemCode,
    data.ticketTitle || 'Untitled Ticket',
    data.ticketId || 0,
    data.technicianName || 'Unknown Technician',
    data.note,
    data.ticketType,
    data.ticketPriority
  );
}

/**
 * Send operations module email notification
 */
async function sendOperationsModuleEmail(
  ownerId: number,
  eventType: string,
  emailFn: EmailTemplateFn,
  ...emailArgs: any[]
): Promise<void> {
  await dispatchModuleEmail(ownerId, 'operations', eventType, emailFn, emailArgs);
}

/**
 * Send mission created email
 */
export async function sendMissionCreatedModuleEmail(
  ownerId: number,
  data: MissionEmailData
): Promise<void> {
  await sendOperationsModuleEmail(
    ownerId,
    'mission_created',
    sendMissionCreatedEmail,
    data.missionCode,
    data.missionType,
    data.createdBy || 'System',
    data.scheduledDate,
    data.description
  );
}

/**
 * Send mission assigned email directly to specific user IDs
 */
export async function sendMissionAssignedModuleEmail(
  ownerId: number,
  data: MissionEmailData,
  recipientUserIds?: number[]
): Promise<void> {
  // Check if mission assigned email is enabled
  const isEnabled = await isModuleEventEmailEnabled(ownerId, 'operations', 'mission_assigned');
  if (!isEnabled) {
    console.log('[sendMissionAssignedModuleEmail] Mission assigned email is disabled for owner:', ownerId);
    return;
  }

  // If specific user IDs are provided, send directly to them
  if (recipientUserIds && recipientUserIds.length > 0) {
    const users = await prisma.public_users.findMany({
      where: { user_id: { in: recipientUserIds } },
      select: { user_id: true, email: true },
    });

    const emails = users.map(u => u.email).filter(Boolean) as string[];
    if (emails.length === 0) {
      console.log('[sendMissionAssignedModuleEmail] No valid emails found for recipient user IDs');
      return;
    }

    // Check daily email limit
    const limitReached = await isDailyEmailLimitReached(ownerId);
    if (limitReached) {
      console.log('[sendMissionAssignedModuleEmail] Daily email limit reached for owner:', ownerId);
      return;
    }

    try {
      await sendMissionAssignedEmail(
        emails,
        data.missionCode,
        data.missionType,
        data.assignedBy || 'System',
        data.assignedTo || 'Unknown',
        data.role || 'Pilot',
        data.scheduledDate ?? undefined,
        data.description
      );
      await incrementDailyEmailCount(ownerId);
      // console.log('[sendMissionAssignedModuleEmail] Email sent successfully to', emails.length, 'recipients');
    } catch (error) {
      console.error('[sendMissionAssignedModuleEmail] Failed to send email:', error);
    }
  } else {
    // Fallback to role-based sending if no specific user IDs provided
    await sendOperationsModuleEmail(
      ownerId,
      'mission_assigned',
      sendMissionAssignedEmail,
      data.missionCode,
      data.missionType,
      data.assignedBy || 'System',
      data.assignedTo || 'Unknown',
      data.role || 'Pilot',
      data.scheduledDate,
      data.description
    );
  }
}

/**
 * Send mission started email
 */
export async function sendMissionStartedModuleEmail(
  ownerId: number,
  data: MissionEmailData
): Promise<void> {
  await sendOperationsModuleEmail(
    ownerId,
    'mission_started',
    sendMissionStartedEmail,
    data.missionCode,
    data.missionType,
    data.startedBy || 'System',
    data.startTime || new Date().toISOString(),
    data.pilot
  );
}

/**
 * Send mission completed email
 */
export async function sendMissionCompletedModuleEmail(
  ownerId: number,
  data: MissionEmailData
): Promise<void> {
  await sendOperationsModuleEmail(
    ownerId,
    'mission_completed',
    sendMissionCompletedEmail,
    data.missionCode,
    data.missionType,
    data.completedBy || 'System',
    data.completionTime || new Date().toISOString(),
    data.duration,
    data.notes
  );
}

/**
 * Send calendar event created email
 */
/*
export async function sendCalendarEventCreatedModuleEmail(
  ownerId: number,
  data: CalendarEventData
): Promise<void> {
  await sendOperationsModuleEmail(
    ownerId,
    'calendar_event_created',
    sendCalendarEventCreatedEmail,
    data.eventTitle,
    data.eventType,
    data.createdBy || 'System',
    data.startDate,
    data.endDate,
    data.location,
    data.description
  );
}
*/

/**
 * Send calendar event updated email
 */
/*
export async function sendCalendarEventUpdatedModuleEmail(
  ownerId: number,
  data: CalendarEventData
): Promise<void> {
  await sendOperationsModuleEmail(
    ownerId,
    'calendar_event_updated',
    sendCalendarEventUpdatedEmail,
    data.eventTitle,
    data.eventType,
    data.updatedBy || 'System',
    data.changes || [],
    data.startDate,
    data.endDate,
    data.location
  );
}
*/

/**
 * Send training module email notification
 */
async function sendTrainingModuleEmail(
  ownerId: number,
  eventType: string,
  courseOwnerUserId: number | null | undefined,
  emailFn: EmailTemplateFn,
  ...emailArgs: any[]
): Promise<void> {
  await dispatchModuleEmail(ownerId, 'training', eventType, emailFn, emailArgs, {
    // Course owner (training.trainer_user_id) is always notified for enabled
    // training events, independent of the configured roles/user list.
    extraRecipientEmails: async (emails) => {
      if (!courseOwnerUserId) return emails;
      const ownerUser = await prisma.public_users.findUnique({
        where: { user_id: courseOwnerUserId },
        select: { email: true, user_active: true },
      });
      if (ownerUser?.email && ownerUser.user_active === 'Y' && !emails.includes(ownerUser.email)) {
        emails.push(ownerUser.email);
      }
      return emails;
    },
  });
}

/**
 * Send training created email
 */
export async function sendTrainingCreatedModuleEmail(
  ownerId: number,
  data: TrainingEmailData
): Promise<void> {
  await sendTrainingModuleEmail(
    ownerId,
    'training_created',
    data.courseOwnerUserId,
    sendTrainingCreatedEmailTemplate,
    data.trainingName,
    data.trainingType,
    data.certificateType,
    data.sessionDate,
    data.attendeeCount,
    data.createdBy
  );
}

/**
 * Send training updated email
 */
export async function sendTrainingUpdatedModuleEmail(
  ownerId: number,
  data: TrainingEmailData
): Promise<void> {
  await sendTrainingModuleEmail(
    ownerId,
    'training_updated',
    data.courseOwnerUserId,
    sendTrainingUpdatedEmailTemplate,
    data.trainingName,
    data.trainingType,
    data.certificateType,
    data.sessionDate,
    data.updatedBy
  );
}

/**
 * Send training deleted email
 */
export async function sendTrainingDeletedModuleEmail(
  ownerId: number,
  data: TrainingEmailData
): Promise<void> {
  await sendTrainingModuleEmail(
    ownerId,
    'training_deleted',
    data.courseOwnerUserId,
    sendTrainingDeletedEmailTemplate,
    data.trainingName,
    data.trainingType,
    data.deletedBy
  );
}

/**
 * Send training certification expiring email
 */
export async function sendTrainingCertificationExpiringModuleEmail(
  ownerId: number,
  data: TrainingEmailData
): Promise<void> {
  await sendTrainingModuleEmail(
    ownerId,
    'training_certification_expiring',
    data.courseOwnerUserId,
    sendTrainingCertificationExpiringEmailTemplate,
    data.trainingName,
    data.expiryDate || '',
    data.daysRemaining || 0,
    data.userName
  );
}
