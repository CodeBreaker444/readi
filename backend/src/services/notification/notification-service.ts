import { supabase } from "@/backend/database/database";
import type {
  MarkReadPayload,
  Notification,
  NotificationListFilters,
} from "@/config/types/notification";
import { prisma } from "@/lib/prisma";
import { revalidateTag, unstable_cache } from "next/cache";
import { sendNotificationEmail } from "../../../../lib/resend/mail";


async function fetchUnreadNotifications(userId: number): Promise<Notification[]> {
  const columns = "notification_id, notification_message, notification_type, notification_data, is_read, created_at, action_url";

  const { data, error } = await supabase
    .from("notification")
    .select(columns)
    .eq("fk_user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const notifData = row.notification_data ?? {};
    const senderFullname: string | null =
      notifData.sender_fullname ??
      (notifData.sender_first_name || notifData.sender_last_name
        ? `${notifData.sender_first_name ?? ""} ${notifData.sender_last_name ?? ""}`.trim()
        : null);

    return {
      notification_id: row.notification_id,
      message: row.notification_message ?? "",
      procedure_name: row.notification_type ?? "",
      is_read: "N" as "Y" | "N",
      created_at: row.created_at,
      read_at: null,
      sender_fullname: senderFullname,
      sender_profile: notifData.sender_profile ?? null,
      sender_profile_code: notifData.sender_profile_code ?? null,
      communication_general_id: notifData.communication_general_id ?? null,
      action_url: row.action_url ?? null,
    } satisfies Notification;
  });
}

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

  if (isLightweightPoll) {
    const tag = `notifications-unread-${userId}`;
    return unstable_cache(
      () => fetchUnreadNotifications(userId),
      [tag],
      { revalidate: 8, tags: [tag] },
    )();
  }

  const columns = "notification_id, notification_message, notification_type, notification_title, notification_data, priority, is_read, created_at, read_at, action_url";

  let query = supabase
    .from("notification")
    .select(columns)
    .eq("fk_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);

  if (input.status === "READ") {
    query = query.eq("is_read", true);
  } else if (input.status === "UNREAD") {
    query = query.eq("is_read", false);
  }

  if (input.procedure_name) {
    query = query.ilike("notification_type", `%${input.procedure_name}%`);
  }

  if (input.search) {
    query = query.ilike("notification_message", `%${input.search}%`);
  }

  if (input.date_from) {
    query = query.gte("created_at", input.date_from);
  }

  if (input.date_to) {
    query = query.lte("created_at", `${input.date_to}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => {
    const notifData = row.notification_data ?? {};
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
  const { error } = await supabase
    .from("notification")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("notification_id", input.notification_id)
    .eq("fk_user_id", userId);

  if (error) throw new Error(error.message);
  revalidateTag(`notifications-unread-${userId}`);
}


export async function markAllNotificationsRead(
  userId: number
): Promise<{ updated: number }> {
  const { data, error } = await supabase
    .from("notification")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("fk_user_id", userId)
    .eq("is_read", false)
    .select("notification_id");

  if (error) throw new Error(error.message);
  revalidateTag(`notifications-unread-${userId}`);

  return { updated: data?.length ?? 0 };
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

export async function sendNotificationToClientManagers(
  toolId: number,
  ownerId: number,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> {
  const tool = await prisma.tool.findUnique({
    where: { tool_id: toolId },
    select: { assigned_client_id: true },
  });

  const clientId = tool?.assigned_client_id;
  if (!clientId) return;

  const users = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      fk_client_id: clientId,
      user_active: 'Y',
      user_role: { in: ['AM', 'OPM'] },
    },
    select: { user_id: true, email: true },
  });

  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      fk_user_id: u.user_id,
      notification_title: title,
      notification_message: message,
      notification_type: 'MAINTENANCE',
      is_read: false,
      action_url: actionUrl ?? null,
      created_at: new Date(),
    })),
  });

  const emailEnabled = await isEmailNotificationsEnabled(ownerId);
  if (emailEnabled) {
    const emails = users.map((u) => u.email).filter((e): e is string => !!e);
    if (emails.length) sendNotificationEmail(emails, title, message, 'MAINTENANCE', actionUrl ?? null);
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
