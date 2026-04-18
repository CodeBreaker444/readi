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
  last_maintenance_date: string | null;
  status: "OK" | "ALERT" | "DUE";
  trigger: string[];
  battery_cycle_ratio: number;
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: "OK" | "ALERT" | "DUE";
  components: ComponentMaintenanceInfo[];
}


function hhmmToMinutes(hhmm: number): number {
  const h = Math.floor(hhmm);
  const m = Math.round((hhmm - h) * 100);
  return h * 60 + m;
}

function addHhmmHours(a: number, b: number): number {
  const totalMin = hhmmToMinutes(a) + hhmmToMinutes(b);
  return Math.floor(totalMin / 60) + (totalMin % 60) / 100;
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
  last_maintenance_date
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
    const currentDays = Number(comp.current_maintenance_days ?? 0);

    const rawMeta = comp.component_metadata;
    let meta: Record<string, unknown> = {};
    if (rawMeta) {
      if (typeof rawMeta === "string") {
        try { meta = JSON.parse(rawMeta); } catch { meta = {}; }
      } else if (typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
        meta = rawMeta as Record<string, unknown>;
      }
    }
    const batteryCycleRatio = typeof meta.battery_cycle_ratio === "number" ? meta.battery_cycle_ratio : 1;

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
      last_maintenance_date: comp.last_maintenance_date || null,
      status,
      trigger,
      battery_cycle_ratio: batteryCycleRatio,
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

  const results = await Promise.all(
    updates.map(async (upd): Promise<ComponentMaintenanceInfo | null> => {
      const { data: comp, error: compErr } = await supabase
        .from("tool_component")
        .select(COMPONENT_SELECT)
        .eq("component_id", upd.component_id)
        .eq("fk_tool_id", toolId)
        .maybeSingle();

      if (compErr || !comp) return null;

      const rawMeta = comp.component_metadata;
      let meta: Record<string, unknown> = {};
      if (rawMeta) {
        if (typeof rawMeta === "string") {
          try { meta = JSON.parse(rawMeta); } catch { meta = {}; }
        } else if (typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
          meta = rawMeta as Record<string, unknown>;
        }
      }
      const cycleType = comp.maintenance_cycle || "NONE";

      const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
      const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
      const limitDay = Number(comp.maintenance_cycle_day ?? 0);

      const prevHours = Number(comp.current_maintenance_hours ?? 0);
      const prevFlights = Number(comp.current_maintenance_flights ?? 0);
      const currentDays = Number(comp.current_maintenance_days ?? 0);
      const prevLifetimeHours = Number(comp.current_usage_hours ?? 0);

      // Applying battery_cycle_ratio: 1 flight may equal <1 battery cycle (0.87)
      const batteryCycleRatio = typeof meta.battery_cycle_ratio === "number" ? meta.battery_cycle_ratio : 1;
      const effectiveFlightCycles = Math.round((upd.add_flights || 0) * batteryCycleRatio * 100) / 100;

      const newHours = addHhmmHours(prevHours, upd.add_hours || 0);
      const newFlights = Math.round((prevFlights + effectiveFlightCycles) * 100) / 100;
      const newLifetimeHours = addHhmmHours(prevLifetimeHours, upd.add_hours || 0);

      const now = new Date().toISOString();

      const updatePayload: Record<string, any> = {
        current_usage_hours: newLifetimeHours,
        component_metadata: JSON.stringify({
          ...meta,
          last_mission_id: missionId,
          last_maintenance_update: now,
        }),
      };

      if (limitHour > 0 && upd.add_hours > 0) {
        updatePayload.current_maintenance_hours = newHours;
      }
      if (limitFlight > 0 && upd.add_flights > 0) {
        updatePayload.current_maintenance_flights = newFlights;
      }


      const { data: updated, error: updateErr } = await supabase
        .from("tool_component")
        .update(updatePayload)
        .eq("component_id", upd.component_id)
        .eq("fk_tool_id", toolId)
        .select("component_id, current_maintenance_hours, current_maintenance_flights")
        .maybeSingle();

      if (updateErr || !updated) {
        console.error(`[maintenance-cycle] update failed for component ${upd.component_id}:`, updateErr, 'updated:', updated);
        return null;
      }

      const finalHours = limitHour > 0 ? newHours : prevHours;
      const finalFlights = limitFlight > 0 ? newFlights : prevFlights;

      const { status, trigger } = computeComponentStatus(
        finalHours, finalFlights, currentDays,
        { hour: limitHour, flight: limitFlight, day: limitDay },
      );

      return {
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
        last_maintenance_date: comp.last_maintenance_date || null,
        status,
        trigger,
        battery_cycle_ratio: batteryCycleRatio,
      };
    }),
  );

  return {
    code: 1,
    message: "Maintenance tracking updated successfully",
    components: results.filter((r): r is ComponentMaintenanceInfo => r !== null),
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