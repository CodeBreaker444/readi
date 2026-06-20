import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

interface ExpiredComponentItem {
  tool_component_id: number;
  component_name: string;
  tool_id: number;
  tool_code: string;
  expiration_date: string;
}

async function getAlreadyNotifiedTodayForExpiry(ownerId: number): Promise<Set<number>> {
  const today = new Date().toISOString().slice(0, 10);

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

  const startOfDay = new Date(`${today}T00:00:00.000Z`);
  const endOfDay = new Date(`${today}T23:59:59.999Z`);

  const notifications = await prisma.notification.findMany({
    where: {
      notification_type: "SYSTEM",
      fk_user_id: { in: userIds },
      created_at: { gte: startOfDay, lte: endOfDay },
      notification_data: { not: Prisma.JsonNull },
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

async function insertExpirationNotifications(
  userIds: number[],
  title: string,
  message: string,
  componentId: number,
  toolId: number
): Promise<void> {
  if (!userIds.length) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      fk_user_id: userId,
      notification_title: title,
      notification_message: message,
      notification_type: "SYSTEM",
      is_read: false,
      action_url: "/systems/manage",
      notification_data: { component_id: componentId, tool_id: toolId, event: "COMPONENT_EXPIRED" },
      created_at: new Date(),
    })),
  });
}

export async function sendExpirationNotifications(
  ownerId: number,
  expiredComponents: ExpiredComponentItem[]
): Promise<void> {
  if (!expiredComponents.length) return;

  const alreadyNotified = await getAlreadyNotifiedTodayForExpiry(ownerId);
  const toNotify = expiredComponents.filter(
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
    const title = `Component Expired — ${item.tool_code}`;
    const message = `Component "${item.component_name}" has expired. System ${item.tool_code} has moved to NOT Operational.`;

    await insertExpirationNotifications(
      managerIds,
      title,
      message,
      item.tool_component_id,
      item.tool_id
    );
  }
}
