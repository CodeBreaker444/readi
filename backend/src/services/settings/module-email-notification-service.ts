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
} from "../../../../lib/resend/mail";
import { isDailyEmailLimitReached, incrementDailyEmailCount, getDailyEmailStats } from "@/backend/services/email/email-limit-service";
import { notifyAdminsOnEmailLimitReached, shouldNotifyEmailLimitReached, markEmailLimitNotificationSent } from "@/backend/services/email/admin-notification-service";

export interface ModuleEmailNotificationConfig {
  config_id: number;
  fk_owner_id: number;
  module_name: string;
  event_type: string;
  is_enabled: boolean | null;
  notification_roles: string[];
  notification_user_ids: number[];
  created_at: Date | null;
  updated_at: Date | null;
}

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

/**
 * Check if email notifications are enabled for a specific module event
 */
export async function isModuleEventEmailEnabled(
  ownerId: number,
  moduleName: string,
  eventType: string
): Promise<boolean> {
  console.log('[isModuleEventEmailEnabled] Checking email enabled for ownerId:', ownerId, 'moduleName:', moduleName, 'eventType:', eventType);
  
  // Check the appropriate company-level email flag based on module
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      email_notifications_enabled: true,
      operation_email_enabled: true,
      system_email_enabled: true,
    },
  });

  if (!owner) {
    console.log('[isModuleEventEmailEnabled] Owner not found for ownerId:', ownerId);
    return false;
  }

  console.log('[isModuleEventEmailEnabled] Owner settings:', {
    email_notifications_enabled: owner.email_notifications_enabled,
    operation_email_enabled: owner.operation_email_enabled,
    system_email_enabled: owner.system_email_enabled,
  });

  let moduleEmailEnabled = false;
  if (moduleName === 'operations') {
    moduleEmailEnabled = owner.operation_email_enabled === true;
  } else if (moduleName === 'maintenance') {
    moduleEmailEnabled = owner.system_email_enabled === true;
  } else {
    // For other modules, use the default email flag
    moduleEmailEnabled = owner.email_notifications_enabled === true;
  }

  console.log('[isModuleEventEmailEnabled] Module email enabled for', moduleName, ':', moduleEmailEnabled);

  if (!moduleEmailEnabled) {
    console.log('[isModuleEventEmailEnabled] Module email is disabled, returning false');
    return false;
  }

  const config = await prisma.module_email_notification_config.findUnique({
    where: {
      fk_owner_id_module_name_event_type: {
        fk_owner_id: ownerId,
        module_name: moduleName,
        event_type: eventType,
      },
    },
    select: { is_enabled: true },
  });

  console.log('[isModuleEventEmailEnabled] Event config:', config);
  const result = config?.is_enabled === true;
  console.log('[isModuleEventEmailEnabled] Final result:', result);
  return result;
}

/**
 * Get email notification configuration for a specific module event
 */
export async function getModuleEmailConfig(
  ownerId: number,
  moduleName: string,
  eventType: string
): Promise<ModuleEmailNotificationConfig | null> {
  return await prisma.module_email_notification_config.findUnique({
    where: {
      fk_owner_id_module_name_event_type: {
        fk_owner_id: ownerId,
        module_name: moduleName,
        event_type: eventType,
      },
    },
  });
}

/**
 * Get all email notification configurations for a company
 */
export async function getAllModuleEmailConfigs(
  ownerId: number
): Promise<ModuleEmailNotificationConfig[]> {
  return await prisma.module_email_notification_config.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: [{ module_name: 'asc' }, { event_type: 'asc' }],
  });
}

/**
 * Get all email notification configurations for a specific module
 */
export async function getModuleEmailConfigs(
  ownerId: number,
  moduleName: string
): Promise<ModuleEmailNotificationConfig[]> {
  return await prisma.module_email_notification_config.findMany({
    where: { 
      fk_owner_id: ownerId,
      module_name: moduleName,
    },
    orderBy: { event_type: 'asc' },
  });
}

/**
 * Update email notification configuration for a specific module event
 */
export async function updateModuleEmailConfig(
  ownerId: number,
  moduleName: string,
  eventType: string,
  data: {
    is_enabled: boolean;
    notification_roles: string[];
    notification_user_ids: number[];
  }
): Promise<ModuleEmailNotificationConfig> {
  return await prisma.module_email_notification_config.upsert({
    where: {
      fk_owner_id_module_name_event_type: {
        fk_owner_id: ownerId,
        module_name: moduleName,
        event_type: eventType,
      },
    },
    update: {
      is_enabled: data.is_enabled,
      notification_roles: data.notification_roles,
      notification_user_ids: data.notification_user_ids,
      updated_at: new Date(),
    },
    create: {
      fk_owner_id: ownerId,
      module_name: moduleName,
      event_type: eventType,
      is_enabled: data.is_enabled,
      notification_roles: data.notification_roles,
      notification_user_ids: data.notification_user_ids,
    },
  });
}

/**
 * Get recipient email addresses for a module event based on configuration
 */
async function getRecipientEmails(
  ownerId: number,
  moduleName: string,
  eventType: string
): Promise<string[]> {
  console.log('[getRecipientEmails] Getting recipient emails for ownerId:', ownerId, 'moduleName:', moduleName, 'eventType:', eventType);
  
  const config = await getModuleEmailConfig(ownerId, moduleName, eventType);
  
  console.log('[getRecipientEmails] Config:', config);
  
  if (!config || !config.is_enabled) {
    console.log('[getRecipientEmails] Config not found or not enabled, returning empty emails');
    return [];
  }

  const emails: string[] = [];
  const userIds = new Set<number>();

  // Add users from specified roles
  if (config.notification_roles.length > 0) {
    console.log('[getRecipientEmails] Looking for users with roles:', config.notification_roles);
    const roleUsers = await prisma.public_users.findMany({
      where: {
        fk_owner_id: ownerId,
        user_active: 'Y',
        user_role: { in: config.notification_roles },
      },
      select: { user_id: true, email: true },
    });

    console.log('[getRecipientEmails] Found role users:', roleUsers.length);

    for (const user of roleUsers) {
      if (user.email) {
        userIds.add(user.user_id);
        emails.push(user.email);
      }
    }
  }

  // Add specific user IDs
  if (config.notification_user_ids.length > 0) {
    console.log('[getRecipientEmails] Looking for specific user IDs:', config.notification_user_ids);
    const specificUsers = await prisma.public_users.findMany({
      where: {
        user_id: { in: config.notification_user_ids },
        user_active: 'Y',
      },
      select: { user_id: true, email: true },
    });

    console.log('[getRecipientEmails] Found specific users:', specificUsers.length);

    for (const user of specificUsers) {
      if (user.email && !userIds.has(user.user_id)) {
        userIds.add(user.user_id);
        emails.push(user.email);
      }
    }
  }

  console.log('[getRecipientEmails] Final recipient emails:', emails);
  return emails;
}

/**
 * Send maintenance module email notification
 */
async function sendMaintenanceModuleEmail(
  ownerId: number,
  eventType: string,
  emailFn: (emails: string[], ...args: any[]) => Promise<void>,
  ...emailArgs: any[]
): Promise<void> {
  
  const isEnabled = await isModuleEventEmailEnabled(ownerId, 'maintenance', eventType);
  console.log('isEnabled:',isEnabled)
  if (!isEnabled) {
    console.log('[sendMaintenanceModuleEmail] Email is not enabled, skipping email send');
    return;
  }

  const emails = await getRecipientEmails(ownerId, 'maintenance', eventType);
  console.log('emails:',emails)
  if (emails.length === 0) {
    console.log('[sendMaintenanceModuleEmail] No recipient emails found, skipping email send');
    return;
  }

  // Check daily email limit
  const limitReached = await isDailyEmailLimitReached(ownerId);
  if (limitReached) {
    console.log('[sendMaintenanceModuleEmail] Daily email limit reached for owner:', ownerId);
    const stats = await getDailyEmailStats(ownerId);
    console.log('[sendMaintenanceModuleEmail] Email stats:', stats);
    
    // Notify admins if limit is reached and notification hasn't been sent today
    if (stats && await shouldNotifyEmailLimitReached(ownerId)) {
      const owner = await prisma.owner.findUnique({
        where: { owner_id: ownerId },
        select: { owner_name: true },
      });

      if (owner) {
        await notifyAdminsOnEmailLimitReached({
          ownerId,
          ownerName: owner.owner_name,
          dailyLimit: stats.limit,
          currentCount: stats.count,
        });
        await markEmailLimitNotificationSent(ownerId);
      }
    }
    return;
  }

  await emailFn(emails, ...emailArgs);

  // Increment email counter
  const newCount = await incrementDailyEmailCount(ownerId);
  console.log('[sendMaintenanceModuleEmail] Email sent, new daily count:', newCount);

  // Check if we just reached the limit
  const stats = await getDailyEmailStats(ownerId);
  if (stats && stats.remaining === 0) {
    console.log('[sendMaintenanceModuleEmail] Daily email limit just reached for owner:', ownerId);
    
    // Get owner details for notification
    const owner = await prisma.owner.findUnique({
      where: { owner_id: ownerId },
      select: { owner_name: true },
    });

    if (owner && await shouldNotifyEmailLimitReached(ownerId)) {
      await notifyAdminsOnEmailLimitReached({
        ownerId,
        ownerName: owner.owner_name,
        dailyLimit: stats.limit,
        currentCount: stats.count,
      });
      await markEmailLimitNotificationSent(ownerId);
    }
  }
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
        data.note,
        data.ticketType,
        data.ticketPriority
      );
      await incrementDailyEmailCount(ownerId);
      console.log('[sendTicketAssignedEmail] Email sent successfully to assigned user');
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
    data.note
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
    undefined, // endTime
    data.note
  );
}

/**
 * Send operations module email notification
 */
async function sendOperationsModuleEmail(
  ownerId: number,
  eventType: string,
  emailFn: (emails: string[], ...args: any[]) => Promise<void>,
  ...emailArgs: any[]
): Promise<void> {
  const isEnabled = await isModuleEventEmailEnabled(ownerId, 'operations', eventType);
  
  if (!isEnabled) {
    return;
  }

  const emails = await getRecipientEmails(ownerId, 'operations', eventType);
  
  if (emails.length === 0) {
    return;
  }

  const limitReached = await isDailyEmailLimitReached(ownerId);
  if (limitReached) {
    console.log('[sendOperationsModuleEmail] Daily email limit reached for owner:', ownerId);
    const stats = await getDailyEmailStats(ownerId);
    console.log('[sendOperationsModuleEmail] Email stats:', stats);
    
    // Notify admins if limit is reached and notification hasn't been sent today
    if (stats && await shouldNotifyEmailLimitReached(ownerId)) {
      const owner = await prisma.owner.findUnique({
        where: { owner_id: ownerId },
        select: { owner_name: true },
      });

      if (owner) {
        await notifyAdminsOnEmailLimitReached({
          ownerId,
          ownerName: owner.owner_name,
          dailyLimit: stats.limit,
          currentCount: stats.count,
        });
        await markEmailLimitNotificationSent(ownerId);
      }
    }
    return;
  }

  await emailFn(emails, ...emailArgs);

  // Increment email counter
  const newCount = await incrementDailyEmailCount(ownerId);
  console.log('[sendOperationsModuleEmail] Email sent, new daily count:', newCount);

  // Check if we just reached the limit
  const stats = await getDailyEmailStats(ownerId);
  if (stats && stats.remaining === 0) {
    console.log('[sendOperationsModuleEmail] Daily email limit just reached for owner:', ownerId);
    
    // Get owner details for notification
    const owner = await prisma.owner.findUnique({
      where: { owner_id: ownerId },
      select: { owner_name: true },
    });

    if (owner && await shouldNotifyEmailLimitReached(ownerId)) {
      await notifyAdminsOnEmailLimitReached({
        ownerId,
        ownerName: owner.owner_name,
        dailyLimit: stats.limit,
        currentCount: stats.count,
      });
      await markEmailLimitNotificationSent(ownerId);
    }
  }
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
      console.log('[sendMissionAssignedModuleEmail] Email sent successfully to', emails.length, 'recipients');
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

/**
 * Send calendar event updated email
 */
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
