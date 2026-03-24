import { supabase } from "@/backend/database/database";
import { refreshMaintenanceDaysForTool } from "@/backend/utils/refresh-maintenance-days";
import { MaintenanceStatus } from "@/config/types/maintenance";


interface UpdateComponentInput {
  component_id: number;
  add_flights: number;
  add_hours: number;
}

interface ComponentMaintenanceInfo {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  serial_number: string | null;
  current_hours: number;
  current_flights: number;
  current_days: number;
  limit_hour: number;
  limit_flight: number;
  limit_day: number;
  maintenance_cycle_type: string;
  last_cycle_updated_at: string | null;
  status: "OK" | "ALERT" | "DUE";
  trigger: string[];
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: "OK" | "ALERT" | "DUE";
  components: ComponentMaintenanceInfo[];
}


function computeComponentStatus(
  currentHours: number,
  currentFlights: number,
  currentDays: number,
  limits: { hour: number; flight: number; day: number }
): { status: "OK" | "ALERT" | "DUE"; trigger: string[] } {
  const trigger: string[] = [];
  let status: "OK" | "ALERT" | "DUE" = "OK";

  const checks: { current: number; limit: number; name: string }[] = [];
  if (limits.hour > 0) checks.push({ current: currentHours, limit: limits.hour, name: "hours" });
  if (limits.flight > 0) checks.push({ current: currentFlights, limit: limits.flight, name: "flights" });
  if (limits.day > 0) checks.push({ current: currentDays, limit: limits.day, name: "days" });

  for (const c of checks) {
    if (c.limit <= 0) continue;
    const ratio = c.current / c.limit;
    if (ratio >= 1) {
      status = "DUE";
      trigger.push(`${c.name} exceeded (${c.current}/${c.limit})`);
    } else if (ratio >= 0.8 && status !== "DUE") {
      status = "ALERT";
      trigger.push(`${c.name} approaching (${c.current}/${c.limit})`);
    }
  }

  return { status, trigger };
}

const COMPONENT_SELECT = `
  component_id,
  component_type,
  component_code,
  component_name,
  serial_number,
  current_usage_hours,
  installation_date,
  component_metadata,
  component_active,
  maintenance_cycle,
  maintenance_cycle_hour,
  maintenance_cycle_day,
  maintenance_cycle_flight,
  current_maintenance_hours,
  current_maintenance_days,
  current_maintenance_flights,
  last_cycle_updated_at
`;


export async function getComponentsForMaintenanceCycle(
  toolId: number,
  ownerId: number
): Promise<SystemData> {
  const { data: tool, error: toolErr } = await supabase
    .from("tool")
    .select("tool_id, tool_code, tool_name")
    .eq("tool_id", toolId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (toolErr || !tool) throw new Error("System not found or unauthorized");

  // Refresh days before reading
  await refreshMaintenanceDaysForTool(toolId);

  const { data: comps, error: compErr } = await supabase
    .from("tool_component")
    .select(COMPONENT_SELECT)
    .eq("fk_tool_id", toolId)
    .eq("component_active", "Y");

  if (compErr) throw compErr;

  const components: ComponentMaintenanceInfo[] = [];
  let worstStatus: "OK" | "ALERT" | "DUE" = "OK";

  for (const comp of comps || []) {
    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);
    const cycleType = comp.maintenance_cycle || "NONE";

    const currentHours = Number(comp.current_maintenance_hours ?? 0);
    const currentFlights = Number(comp.current_maintenance_flights ?? 0);
    // Use DB value directly — already refreshed above
    const currentDays = Number(comp.current_maintenance_days ?? 0);

    const hasLimits = limitHour > 0 || limitFlight > 0 || limitDay > 0;
    const { status, trigger } = hasLimits
      ? computeComponentStatus(currentHours, currentFlights, currentDays, {
          hour: limitHour,
          flight: limitFlight,
          day: limitDay,
        })
      : { status: "OK" as const, trigger: [] };

    if (status === "DUE") worstStatus = "DUE";
    else if (status === "ALERT" && worstStatus !== "DUE") worstStatus = "ALERT";

    components.push({
      component_id: comp.component_id,
      component_type: comp.component_type,
      component_code: comp.component_code || comp.component_name,
      serial_number: comp.serial_number,
      current_hours: currentHours,
      current_flights: currentFlights,
      current_days: currentDays,
      limit_hour: limitHour,
      limit_flight: limitFlight,
      limit_day: limitDay,
      maintenance_cycle_type: cycleType,
      last_cycle_updated_at: comp.last_cycle_updated_at || null,
      status,
      trigger,
    });
  }

  return {
    tool_id: tool.tool_id,
    tool_code: tool.tool_code,
    tool_name: tool.tool_name,
    system_status: worstStatus,
    components,
  };
}


export async function updateComponentMaintenanceCycle(
  toolId: number,
  missionId: number,
  ownerId: number,
  updates: UpdateComponentInput[]
): Promise<{ code: number; message: string; components: ComponentMaintenanceInfo[] }> {
  const { data: tool, error: toolErr } = await supabase
    .from("tool")
    .select("tool_id")
    .eq("tool_id", toolId)
    .eq("fk_owner_id", ownerId)
    .single();

  if (toolErr || !tool) throw new Error("System not found or unauthorized");

  // Refresh days before reading baselines
  await refreshMaintenanceDaysForTool(toolId);

  const updatedComponents: ComponentMaintenanceInfo[] = [];

  for (const upd of updates) {
    const { data: comp, error: compErr } = await supabase
      .from("tool_component")
      .select(COMPONENT_SELECT)
      .eq("component_id", upd.component_id)
      .eq("fk_tool_id", toolId)
      .maybeSingle();

    if (compErr || !comp) continue;

    const meta = comp.component_metadata || {};
    const cycleType = comp.maintenance_cycle || "NONE";

    // Limits
    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);

    // Current values from DB (days already refreshed)
    const prevHours = Number(comp.current_maintenance_hours ?? 0);
    const prevFlights = Number(comp.current_maintenance_flights ?? 0);
    const currentDays = Number(comp.current_maintenance_days ?? 0);
    const prevLifetimeHours = comp.current_usage_hours ?? 0;

    // Calculate new values
    const newHours = prevHours + (upd.add_hours || 0);
    const newFlights = prevFlights + (upd.add_flights || 0);
    const newLifetimeHours = prevLifetimeHours + (upd.add_hours || 0);

    const now = new Date().toISOString();

    // Build update payload — only touch counters relevant to cycle type
    const updatePayload: Record<string, any> = {
      current_usage_hours: newLifetimeHours,
      last_cycle_updated_at: now,
      component_metadata: {
        ...meta,
        last_mission_id: missionId,
        last_maintenance_update: now,
      },
    };

    if (cycleType === "HOURS" || cycleType === "MIXED") {
      updatePayload.current_maintenance_hours = newHours;
    }
    if (cycleType === "FLIGHTS" || cycleType === "MIXED") {
      updatePayload.current_maintenance_flights = newFlights;
    }
    // Do NOT touch current_maintenance_days — refreshMaintenanceDays handles it

    const { error: updateErr } = await supabase
      .from("tool_component")
      .update(updatePayload)
      .eq("component_id", upd.component_id);

    if (updateErr) continue;

    // Use updated values for status computation
    const finalHours = (cycleType === "HOURS" || cycleType === "MIXED") ? newHours : prevHours;
    const finalFlights = (cycleType === "FLIGHTS" || cycleType === "MIXED") ? newFlights : prevFlights;

    const { status, trigger } = computeComponentStatus(
      finalHours,
      finalFlights,
      currentDays,
      { hour: limitHour, flight: limitFlight, day: limitDay }
    );

    updatedComponents.push({
      component_id: comp.component_id,
      component_type: comp.component_type,
      component_code: comp.component_code || comp.component_name,
      serial_number: comp.serial_number,
      current_hours: finalHours,
      current_flights: finalFlights,
      current_days: currentDays,
      limit_hour: limitHour,
      limit_flight: limitFlight,
      limit_day: limitDay,
      maintenance_cycle_type: cycleType,
      last_cycle_updated_at: now,
      status,
      trigger,
    });
  }

  return {
    code: 1,
    message: "Maintenance tracking updated successfully",
    components: updatedComponents,
  };
}


export async function getToolMaintenanceStatus(
  toolId: number
): Promise<MaintenanceStatus> {
  // Open maintenance ticket takes highest priority
  const { data: openTicket } = await supabase
    .from("maintenance_ticket")
    .select("ticket_id")
    .eq("fk_tool_id", toolId)
    .neq("ticket_status", "CLOSED")
    .limit(1)
    .maybeSingle();

  if (openTicket) return "IN_MAINTENANCE";

  await refreshMaintenanceDaysForTool(toolId);

  const { data: components } = await supabase
    .from("tool_component")
    .select(`
      component_id,
      maintenance_cycle,
      maintenance_cycle_hour,
      maintenance_cycle_day,
      maintenance_cycle_flight,
      current_maintenance_hours,
      current_maintenance_days,
      current_maintenance_flights
    `)
    .eq("fk_tool_id", toolId)
    .eq("component_active", "Y");

  if (!components || components.length === 0) return "OK";

  let worst: MaintenanceStatus = "OK";

  for (const comp of components) {
    const cycleType = comp.maintenance_cycle || "NONE";
    if (cycleType === "NONE") continue;

    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);

    const currentHours = Number(comp.current_maintenance_hours ?? 0);
    const currentFlights = Number(comp.current_maintenance_flights ?? 0);
    const currentDays = Number(comp.current_maintenance_days ?? 0);

    const { status } = computeComponentStatus(
      currentHours,
      currentFlights,
      currentDays,
      { hour: limitHour, flight: limitFlight, day: limitDay }
    );

    if (status === "DUE") { worst = "DUE"; break; }
    if (status === "ALERT") worst = "ALERT";
  }

  return worst;
}