import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const INSURANCE_EXPIRY_NOTIFICATION_TYPE = "INSURANCE_EXPIRY";

interface ExpiringInsuranceItem {
  insurance_id: number;
  component_id: number;
  component_name: string;
  tool_id: number;
  tool_code: string;
  expiry_date: string;
  days_remaining: number;
  alert_recipients: string[];
}

async function getAlreadyNotifiedTodayForInsurance(ownerId: number): Promise<Set<number>> {
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
      notification_type: INSURANCE_EXPIRY_NOTIFICATION_TYPE,
      fk_user_id: { in: userIds },
      created_at: { gte: startOfDay, lte: endOfDay },
      notification_data: { not: Prisma.JsonNull },
    },
    select: { notification_data: true },
  });

  const ids = new Set<number>();
  for (const row of notifications) {
    const insuranceId = (row.notification_data as any)?.insurance_id;
    if (typeof insuranceId === "number") ids.add(insuranceId);
  }
  return ids;
}

async function insertInsuranceNotifications(
  userIds: number[],
  title: string,
  message: string,
  item: ExpiringInsuranceItem,
): Promise<void> {
  if (!userIds.length) return;

  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      fk_user_id: userId,
      notification_title: title,
      notification_message: message,
      notification_type: INSURANCE_EXPIRY_NOTIFICATION_TYPE,
      priority: item.days_remaining <= 7 ? "HIGH" : "NORMAL",
      is_read: false,
      action_url: "/systems/manage",
      notification_data: {
        insurance_id: item.insurance_id,
        component_id: item.component_id,
        tool_id: item.tool_id,
        expiry_date: item.expiry_date,
        days_remaining: item.days_remaining,
        event: "INSURANCE_EXPIRING",
      },
      created_at: new Date(),
    })),
  });

  // NOTE: `item.alert_recipients` holds the configurable recipient email list from
  // the d-flight import/sync (component_insurance.alert_recipients). Actually
  // dispatching the email is intentionally out of scope for this change — wire a
  // mail provider here (e.g. resend) when that's ready.
}

export async function sendInsuranceExpiryNotifications(
  ownerId: number,
  expiringInsurances: ExpiringInsuranceItem[],
): Promise<void> {
  if (!expiringInsurances.length) return;

  const alreadyNotified = await getAlreadyNotifiedTodayForInsurance(ownerId);
  const toNotify = expiringInsurances.filter((item) => !alreadyNotified.has(item.insurance_id));
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
    const title = `Insurance Expiring — ${item.tool_code}`;
    const message = `Insurance for component "${item.component_name}" (system ${item.tool_code}) expires on ${item.expiry_date} (${item.days_remaining} day${item.days_remaining === 1 ? "" : "s"} left).`;

    await insertInsuranceNotifications(managerIds, title, message, item);
  }
}

// Finds component_insurance rows whose expiry_date falls within each row's own
// configurable alert_days_before window (default 30) and hasn't passed yet.
export async function findExpiringInsurancesForOwner(ownerId: number): Promise<ExpiringInsuranceItem[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const insurances = await prisma.component_insurance.findMany({
    where: {
      expiry_date: { not: null, gte: today },
      tool_component: {
        component_active: "Y",
        tool: { fk_owner_id: ownerId, tool_active: "Y" },
      },
    },
    select: {
      insurance_id: true,
      expiry_date: true,
      alert_recipients: true,
      alert_days_before: true,
      tool_component: {
        select: {
          component_id: true,
          component_name: true,
          tool: { select: { tool_id: true, tool_code: true } },
        },
      },
    },
  });

  const result: ExpiringInsuranceItem[] = [];
  for (const ins of insurances) {
    if (!ins.expiry_date) continue;
    const daysRemaining = Math.ceil((ins.expiry_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const threshold = ins.alert_days_before ?? 30;
    if (daysRemaining > threshold) continue;

    result.push({
      insurance_id: ins.insurance_id,
      component_id: ins.tool_component.component_id,
      component_name: ins.tool_component.component_name,
      tool_id: ins.tool_component.tool.tool_id,
      tool_code: ins.tool_component.tool.tool_code ?? "",
      expiry_date: ins.expiry_date.toISOString().slice(0, 10),
      days_remaining: daysRemaining,
      alert_recipients: Array.isArray(ins.alert_recipients) ? (ins.alert_recipients as string[]) : [],
    });
  }
  return result;
}
