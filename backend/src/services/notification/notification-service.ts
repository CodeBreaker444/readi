import { prisma } from "@/lib/prisma";
import type {
  MarkReadPayload,
  Notification,
  NotificationListFilters,
} from "@/config/types/notification";
import { sendNotificationEmail } from "../../../../lib/resend/mail";


export async function listNotifications(
  input: NotificationListFilters,
  userId: number
): Promise<Notification[]> {
  const isLightweightPoll =
    input.status === "UNREAD" &&
    !input.search &&
    !input.procedure_name &&
    !input.date_from &&
    !input.date_to;

  const select = isLightweightPoll
    ? {
        notification_id: true,
        notification_message: true,
        notification_type: true,
        notification_data: true,
        is_read: true,
        created_at: true,
        action_url: true,
      }
    : {
        notification_id: true,
        notification_message: true,
        notification_type: true,
        notification_title: true,
        notification_data: true,
        priority: true,
        is_read: true,
        created_at: true,
        read_at: true,
        action_url: true,
      };

  const rows = await prisma.notification.findMany({
    where: {
      fk_user_id: userId,
      ...(input.status === "READ" && { is_read: true }),
      ...(input.status === "UNREAD" && { is_read: false }),
      ...(input.procedure_name && {
        notification_type: { contains: input.procedure_name, mode: "insensitive" },
      }),
      ...(input.search && {
        notification_message: { contains: input.search, mode: "insensitive" },
      }),
      ...(input.date_from && { created_at: { gte: new Date(input.date_from) } }),
      ...(input.date_to && { created_at: { lte: new Date(`${input.date_to}T23:59:59`) } }),
    },
    select,
    orderBy: { created_at: "desc" },
    take: input.limit ?? 100,
  });

  return rows.map((row: any) => {
    const notifData = (row.notification_data as Record<string, any>) ?? {};

    const senderFullname: string | null =
      notifData.sender_fullname ??
      (notifData.sender_first_name || notifData.sender_last_name
        ? `${notifData.sender_first_name ?? ""} ${notifData.sender_last_name ?? ""}`.trim()
        : null);

    return {
      notification_id: row.notification_id,
      message: row.notification_message ?? row.notification_title ?? "",
      procedure_name: row.notification_type ?? "",
      is_read: row.is_read ? "Y" : ("N" as "Y" | "N"),
      created_at: row.created_at,
      read_at: row.read_at ?? null,
      sender_fullname: senderFullname,
      sender_profile: notifData.sender_profile ?? null,
      sender_profile_code: notifData.sender_profile_code ?? null,
      communication_general_id: notifData.communication_general_id ?? null,
      action_url: row.action_url ?? null,
    } satisfies Notification;
  });
}


export async function markNotificationRead(
  input: MarkReadPayload,
  userId: number
): Promise<void> {
  await prisma.notification.updateMany({
    where: { notification_id: input.notification_id, fk_user_id: userId },
    data: { is_read: true, read_at: new Date() },
  });
}


export async function markAllNotificationsRead(
  userId: number
): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { fk_user_id: userId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });

  return { updated: result.count };
}


export async function deleteNotification(
  notification_id: number,
  userId: number
): Promise<void> {
  await prisma.notification.deleteMany({
    where: { notification_id, fk_user_id: userId },
  });
}


async function isEmailNotificationsEnabled(ownerId: number): Promise<boolean> {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: { email_notifications_enabled: true },
  });
  return owner?.email_notifications_enabled === true;
}

/**
 * Fire-and-forget: send a notification to all active users of the given roles within an owner.
 */
export async function sendNotificationToRoles(
  ownerId: number,
  roles: string[],
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  const users = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_active: "Y", user_role: { in: roles } },
    select: { user_id: true, email: true },
  });

  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      fk_user_id: u.user_id,
      notification_title: title,
      notification_message: message,
      notification_type: "MAINTENANCE",
      is_read: false,
      action_url: actionUrl ?? null,
      created_at: new Date(),
    })),
  });

  const emailEnabled = await isEmailNotificationsEnabled(ownerId);
  if (emailEnabled) {
    const emails = users.map((u) => u.email).filter((e): e is string => !!e);
    sendNotificationEmail(emails, title, message, "MAINTENANCE", actionUrl ?? null);
  }
}

export interface AssignmentNotificationPayload {
  pilotUserId: number;
  missionId: number;
  missionCode: string;
  fromUserId: number;
}

export async function notifyPilotAssignment(
  assignments: AssignmentNotificationPayload | AssignmentNotificationPayload[]
): Promise<void> {
  const rows = (Array.isArray(assignments) ? assignments : [assignments]).map((a) => ({
    fk_user_id: a.pilotUserId,
    notification_type: "assignment",
    notification_title: "New Assignment",
    notification_message: `You have been assigned to operation ${a.missionCode}`,
    notification_data: {
      mission_id: a.missionId,
      task_code: a.missionCode,
      from_user_id: a.fromUserId,
    },
    priority: "normal",
    is_read: false,
    created_at: new Date(),
  }));

  console.log("[notifyPilotAssignment] inserting", rows.length, "notification(s) for user", rows[0]?.fk_user_id);

  try {
    await prisma.notification.createMany({ data: rows });
  } catch (error: any) {
    console.error("[notifyPilotAssignment] insert failed:", error.message);
  }
}

/**
 * Fire-and-forget: send a notification to a specific user.
 */
export async function sendNotificationToUser(
  userId: number,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      fk_user_id: userId,
      notification_title: title,
      notification_message: message,
      notification_type: "MAINTENANCE",
      is_read: false,
      action_url: actionUrl ?? null,
      created_at: new Date(),
    },
  });

  const user = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { email: true, fk_owner_id: true },
  });

  if (user?.fk_owner_id) {
    const emailEnabled = await isEmailNotificationsEnabled(user.fk_owner_id);
    if (emailEnabled && user.email) {
      sendNotificationEmail([user.email], title, message, "MAINTENANCE", actionUrl ?? null);
    }
  }
}
