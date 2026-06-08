import { supabase } from "@/backend/database/database";

interface ExpiredComponentItem {
  tool_component_id: number;
  component_name: string;
  tool_id: number;
  tool_code: string;
  expiration_date: string;
}

async function getAlreadyNotifiedTodayForExpiry(ownerId: number): Promise<Set<number>> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: ownerUsers } = await supabase
    .from("users")
    .select("user_id")
    .eq("fk_owner_id", ownerId)
    .eq("user_active", "Y")
    .in("user_role", ["OPM", "RM", "ADMIN"]);

  const userIds = (ownerUsers ?? []).map((u: any) => u.user_id as number);
  if (!userIds.length) return new Set();

  const { data } = await supabase
    .from("notification")
    .select("notification_data")
    .eq("notification_type", "SYSTEM")
    .in("fk_user_id", userIds)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`)
    .not("notification_data", "is", null);

  const ids = new Set<number>();
  for (const row of data ?? []) {
    const cid = (row as any).notification_data?.component_id;
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

  const rows = userIds.map((userId) => ({
    fk_user_id: userId,
    notification_title: title,
    notification_message: message,
    notification_type: "SYSTEM",
    is_read: false,
    action_url: "/systems/manage",
    notification_data: { component_id: componentId, tool_id: toolId, event: "COMPONENT_EXPIRED" },
    created_at: new Date().toISOString(),
  }));

  await supabase.from("notification").insert(rows);
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

  const { data: managers } = await supabase
    .from("users")
    .select("user_id")
    .eq("fk_owner_id", ownerId)
    .eq("user_active", "Y")
    .in("user_role", ["OPM", "RM", "ADMIN"]);

  if (!managers?.length) return;

  const managerIds = (managers as { user_id: number }[]).map((u) => u.user_id);

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
