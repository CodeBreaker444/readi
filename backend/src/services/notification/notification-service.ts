import { supabase } from "@/backend/database/database";
import type {
    MarkReadPayload,
    Notification,
    NotificationListFilters,
} from "@/config/types/notification";


export async function listNotifications(
  input: NotificationListFilters,
  userId: number
): Promise<Notification[]> {
  let query = supabase
    .from("notification")
    .select(
      `
      notification_id,
      notification_message,
      notification_type,
      notification_title,
      notification_data,
      priority,
      is_read,
      created_at,
      read_at,
      action_url,
      fk_user_id
      `
    )
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

  return { updated: data?.length ?? 0 };
}


export async function deleteNotification(
  notification_id: number,
  userId: number
): Promise<void> {
  const { error } = await supabase
    .from("notification")
    .delete()
    .eq("notification_id", notification_id)
    .eq("fk_user_id", userId);

  if (error) throw new Error(error.message);
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
  const { data: users } = await supabase
    .from("users")
    .select("user_id")
    .eq("fk_owner_id", ownerId)
    .eq("user_active", "Y")
    .in("user_role", roles);

  if (!users?.length) return;

  const notifications = users.map((u: { user_id: number }) => ({
    fk_user_id: u.user_id,
    notification_title: title,
    notification_message: message,
    notification_type: "MAINTENANCE",
    is_read: false,
    action_url: actionUrl ?? null,
    created_at: new Date().toISOString(),
  }));

  await supabase.from("notification").insert(notifications);
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
  await supabase.from("notification").insert({
    fk_user_id: userId,
    notification_title: title,
    notification_message: message,
    notification_type: "MAINTENANCE",
    is_read: false,
    action_url: actionUrl ?? null,
    created_at: new Date().toISOString(),
  });
}