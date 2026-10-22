/**
 * Per-company email configuration: which module events send email and to whom.
 *
 *  - owner-level module switches (operation / system / training / default)
 *  - per-event config rows (module_email_notification_config)
 *  - recipient resolution (roles + specific users)
 *
 * Sending (daily limit, counters, admin warnings) lives in module-email-dispatch.ts.
 */
import { prisma } from "@/lib/prisma";

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

export interface OwnerEmailFlags {
  email_notifications_enabled: boolean | null;
  operation_email_enabled: boolean | null;
  system_email_enabled: boolean | null;
  training_email_enabled: boolean | null;
}

/**
 * Which owner-level switch controls a module.
 * 'maintenance' is controlled by system_email_enabled (NOT a maintenance_* flag).
 */
export function isModuleFlagEnabled(owner: OwnerEmailFlags, moduleName: string): boolean {
  if (moduleName === 'operations') return owner.operation_email_enabled === true;
  if (moduleName === 'maintenance') return owner.system_email_enabled === true;
  if (moduleName === 'training') return owner.training_email_enabled === true;
  // For other modules, use the default email flag
  return owner.email_notifications_enabled === true;
}

/**
 * Pure recipient merge: role users first, then specific users not already included (by user_id).
 * Users without an email address are skipped.
 */
export function mergeRecipientEmails(
  roleUsers: { user_id: number; email: string | null }[],
  specificUsers: { user_id: number; email: string | null }[]
): string[] {
  const emails: string[] = [];
  const userIds = new Set<number>();

  for (const user of roleUsers) {
    if (user.email) {
      userIds.add(user.user_id);
      emails.push(user.email);
    }
  }

  for (const user of specificUsers) {
    if (user.email && !userIds.has(user.user_id)) {
      userIds.add(user.user_id);
      emails.push(user.email);
    }
  }

  return emails;
}

/**
 * Check if email notifications are enabled for a specific module event
 */
export async function isModuleEventEmailEnabled(
  ownerId: number,
  moduleName: string,
  eventType: string
): Promise<boolean> {
  // Check the appropriate company-level email flag based on module
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      email_notifications_enabled: true,
      operation_email_enabled: true,
      system_email_enabled: true,
      training_email_enabled: true,
    },
  });

  if (!owner) {
    console.log('[isModuleEventEmailEnabled] Owner not found for ownerId:', ownerId);
    return false;
  }

  if (!isModuleFlagEnabled(owner, moduleName)) {
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

  return config?.is_enabled === true;
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
export async function getRecipientEmails(
  ownerId: number,
  moduleName: string,
  eventType: string
): Promise<string[]> {
  const config = await getModuleEmailConfig(ownerId, moduleName, eventType);

  console.log('[getRecipientEmails] Config:', config);

  if (!config || !config.is_enabled) {
    console.log('[getRecipientEmails] Config not found or not enabled, returning empty emails');
    return [];
  }

  // Users from specified roles
  const roleUsers = config.notification_roles.length > 0
    ? await prisma.public_users.findMany({
        where: {
          fk_owner_id: ownerId,
          user_active: 'Y',
          user_role: { in: config.notification_roles },
        },
        select: { user_id: true, email: true },
      })
    : [];

  // Specific user IDs
  const specificUsers = config.notification_user_ids.length > 0
    ? await prisma.public_users.findMany({
        where: {
          user_id: { in: config.notification_user_ids },
          user_active: 'Y',
        },
        select: { user_id: true, email: true },
      })
    : [];

  return mergeRecipientEmails(roleUsers, specificUsers);
}
