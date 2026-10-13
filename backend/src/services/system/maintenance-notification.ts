/**
 * Delivery of maintenance alerts: in-app notifications + module emails.
 * What gets alerted (and the wording) is decided in maintenance-alert-logic.ts.
 */
import { prisma } from "@/lib/prisma";
import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { MaintenanceDrone } from "@/config/types/maintenance";
import {
  sendMaintenanceAlertEmail,
  sendMaintenanceDueEmail,
} from "@/backend/services/settings/module-email-notification-service";
import {
  MAINTENANCE_ALERT_ROLES,
  MAINTENANCE_ALERT_THRESHOLD_PERCENT,
  buildAlertContent,
  collectAlertItems,
  extractNotifiedComponentIds,
  filterNotYetNotified,
} from "@/backend/services/system/maintenance-alert-logic";

async function getAlertManagerIds(ownerId: number): Promise<number[]> {
  const managers = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: "Y",
      user_role: { in: MAINTENANCE_ALERT_ROLES },
    },
    select: { user_id: true },
  });
  return managers.map((u) => u.user_id);
}

async function getAlreadyNotifiedToday(ownerId: number): Promise<Set<number>> {
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(`${today}T23:59:59.999Z`);

  const userIds = await getAlertManagerIds(ownerId);
  if (!userIds.length) return new Set();

  const notifications = await prisma.notification.findMany({
    where: {
      notification_type: "MAINTENANCE",
      fk_user_id: { in: userIds },
      created_at: { gte: todayStart, lte: todayEnd },
    },
    select: { notification_data: true },
  });

  return extractNotifiedComponentIds(notifications);
}

async function insertAlertNotifications(
  userIds: number[],
  title: string,
  message: string,
  componentId: number,
  status: string
): Promise<void> {
  if (!userIds.length) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      fk_user_id: userId,
      notification_title: title,
      notification_message: message,
      notification_type: "MAINTENANCE",
      is_read: false,
      action_url: "/systems/maintenance-dashboard",
      notification_data: { component_id: componentId, status },
      created_at: new Date(),
    })),
  });
}

export async function sendMaintenanceAlertNotifications(
  ownerId: number,
  drones: MaintenanceDrone[]
): Promise<void> {
  const alertItems = collectAlertItems(drones);
  if (!alertItems.length) return;

  const alreadyNotified = await getAlreadyNotifiedToday(ownerId);
  const toNotify = filterNotYetNotified(alertItems, alreadyNotified);
  if (!toNotify.length) return;

  const managerIds = await getAlertManagerIds(ownerId);
  if (!managerIds.length) return;

  for (const item of toNotify) {
    const { title, message, isDue } = buildAlertContent(item);

    await insertAlertNotifications(
      managerIds,
      title,
      message,
      item.tool_component_id,
      item.status
    );

    // Send module-based email notification
    if (isDue) {
      sendMaintenanceDueEmail(ownerId, {
        systemCode: item.system_code,
        componentName: item.component_name,
        status: item.status,
        triggers: item.triggers,
      }).catch((error) => {
        console.error(`[MaintenanceNotification] Failed to send maintenance due email:`, error);
      });
    } else {
      sendMaintenanceAlertEmail(ownerId, {
        systemCode: item.system_code,
        componentName: item.component_name,
        status: item.status,
        triggers: item.triggers,
      }).catch((error) => {
        console.error(`[MaintenanceNotification] Failed to send maintenance alert email:`, error);
      });
    }
  }
}

export async function triggerMaintenanceAlertCheck(ownerId: number): Promise<void> {
  const drones = await getMaintenanceDashboard({
    owner_id: ownerId,
    client_id: 0,
    threshold_alert: MAINTENANCE_ALERT_THRESHOLD_PERCENT,
  });
  await sendMaintenanceAlertNotifications(ownerId, drones);
}
