import { prisma } from "@/lib/prisma";
import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { MaintenanceDrone } from "@/config/types/maintenance";

interface AlertItem {
  tool_component_id: number;
  component_name: string;
  system_code: string;
  status: "ALERT" | "DUE";
  triggers: string[];
}

async function getAlreadyNotifiedToday(ownerId: number): Promise<Set<number>> {
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${today}T00:00:00.000Z`);
  const todayEnd = new Date(`${today}T23:59:59.999Z`);

  const ownerUsers = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: "Y",
      user_role: { in: ["OPM", "RM", "ADMIN"] },
    },
    select: { user_id: true },
  });

  const userIds = ownerUsers.map((u) => u.user_id);
  if (!userIds.length) return new Set();

  const notifications = await prisma.notification.findMany({
    where: {
      notification_type: "MAINTENANCE",
      fk_user_id: { in: userIds },
      created_at: { gte: todayStart, lte: todayEnd },
    },
    select: { notification_data: true },
  });

  const ids = new Set<number>();
  for (const row of notifications) {
    const cid = (row.notification_data as any)?.component_id;
    if (typeof cid === "number") ids.add(cid);
  }
  return ids;
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
  const alertItems: AlertItem[] = [];
  for (const drone of drones) {
    for (const comp of drone.components) {
      if (comp.status === "ALERT" || comp.status === "DUE") {
        alertItems.push({
          tool_component_id: comp.tool_component_id,
          component_name: comp.component_name,
          system_code: drone.code,
          status: comp.status,
          triggers: comp.trigger.filter((t): t is string => !!t),
        });
      }
    }
  }

  if (!alertItems.length) return;

  const alreadyNotified = await getAlreadyNotifiedToday(ownerId);
  const toNotify = alertItems.filter(
    (item) => !alreadyNotified.has(item.tool_component_id)
  );

  if (!toNotify.length) return;

  const managers = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: "Y",
      user_role: { in: ["OPM", "RM", "ADMIN"] },
    },
    select: { user_id: true },
  });

  if (!managers.length) return;

  const managerIds = managers.map((u) => u.user_id);

  for (const item of toNotify) {
    const isDue = item.status === "DUE";
    const triggerStr = item.triggers.length
      ? item.triggers.map((t) => t.toLowerCase()).join(", ")
      : "maintenance limit";

    const title = isDue
      ? `Maintenance Required — ${item.system_code}`
      : `Maintenance Alert — ${item.system_code}`;

    const message = isDue
      ? `Component "${item.component_name}" on system ${item.system_code} has reached its maintenance limit (${triggerStr}). Immediate maintenance required.`
      : `Component "${item.component_name}" on system ${item.system_code} is approaching its maintenance limit (${triggerStr}).`;

    await insertAlertNotifications(
      managerIds,
      title,
      message,
      item.tool_component_id,
      item.status
    );
  }
}

export async function triggerMaintenanceAlertCheck(ownerId: number): Promise<void> {
  const drones = await getMaintenanceDashboard({
    owner_id: ownerId,
    client_id: 0,
    threshold_alert: 80,
  });
  await sendMaintenanceAlertNotifications(ownerId, drones);
}
