import { supabase } from "@/backend/database/database";
import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { MaintenanceDrone } from "@/config/types/maintenance";
// import { sendMaintenanceAlertEmail } from "@/lib/resend/mail";

interface AlertItem {
  tool_component_id: number;
  component_name: string;
  system_code: string;
  status: "ALERT" | "DUE";
  triggers: string[];
}

/**
 * Returns the set of component IDs that already received a maintenance alert
 * notification today for this owner — used to avoid re-notifying within the
 * same calendar day.
 */
async function getAlreadyNotifiedToday(ownerId: number): Promise<Set<number>> {
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
    .eq("notification_type", "MAINTENANCE")
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

async function insertAlertNotifications(
  userIds: number[],
  title: string,
  message: string,
  componentId: number,
  status: string
): Promise<void> {
  if (!userIds.length) return;

  const rows = userIds.map((userId) => ({
    fk_user_id: userId,
    notification_title: title,
    notification_message: message,
    notification_type: "MAINTENANCE",
    is_read: false,
    action_url: "/systems/maintenance-dashboard",
    notification_data: { component_id: componentId, status },
    created_at: new Date().toISOString(),
  }));

  await supabase.from("notification").insert(rows);
}

/**
 * Fire-and-forget: called after the maintenance dashboard data is fetched.
 * Sends in-app notifications to maintenance managers (OPM, RM, ADMIN) for any
 * component whose status has crossed ALERT or DUE, once per component per day.
 *
 */
export async function sendMaintenanceAlertNotifications(
  ownerId: number,
  drones: MaintenanceDrone[]
): Promise<void> {
  // Collect components that need attention (skip IN_MAINTENANCE — already ticketed)
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

  // Skip components already notified today
  const alreadyNotified = await getAlreadyNotifiedToday(ownerId);
  const toNotify = alertItems.filter(
    (item) => !alreadyNotified.has(item.tool_component_id)
  );

  if (!toNotify.length) return;

  // Fetch maintenance managers for this owner in one query
  const { data: managers } = await supabase
    .from("users")
    .select("user_id, email, first_name, last_name")
    .eq("fk_owner_id", ownerId)
    .eq("user_active", "Y")
    .in("user_role", ["OPM", "RM", "ADMIN"]);

  if (!managers?.length) return;

  const managerIds = (managers as { user_id: number }[]).map((u) => u.user_id);

  // Email option — uncomment when MaintenanceAlertEmail template is ready
  // const managerEmails = (managers as { email: string }[])
  //   .map((u) => u.email)
  //   .filter(Boolean);

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

    // Email notification — uncomment when email template is ready
    // await sendMaintenanceAlertEmail(
    //   managerEmails,
    //   item.system_code,
    //   item.component_name,
    //   item.status,
    //   item.triggers
    // );
  }
}

/**
 * Self-contained trigger: fetches the maintenance dashboard (which also runs
 * refreshMaintenanceDays internally) then dispatches alerts for any ALERT/DUE
 * components.  Call fire-and-forget from any entry-point (dashboard, cron, etc.)
 * to ensure managers are notified once per day without opening the maintenance page.
 */
export async function triggerMaintenanceAlertCheck(ownerId: number): Promise<void> {
  const drones = await getMaintenanceDashboard({
    owner_id: ownerId,
    client_id: 0,
    threshold_alert: 80,
  });
  await sendMaintenanceAlertNotifications(ownerId, drones);
}
