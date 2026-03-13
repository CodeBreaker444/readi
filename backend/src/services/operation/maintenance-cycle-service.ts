import { supabase } from "@/backend/database/database";
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
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: "OK" | "ALERT" | "DUE";
  components: ComponentMaintenanceInfo[];
}


function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
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

    // Skiping components with no limits configured
    if (limitHour === 0 && limitFlight === 0 && limitDay === 0) continue;

    // CURRENT accumulated usage from dedicated columns
    const currentHours = Number(comp.current_maintenance_hours ?? 0);
    const currentFlights = Number(comp.current_maintenance_flights ?? 0);

    // Days: auto-calculate from last_maintenance_date  
    const lastMaintDate = comp.last_maintenance_date || null;
    const currentDays = lastMaintDate
      ? daysBetween(new Date(lastMaintDate), new Date())
      : Number(comp.current_maintenance_days ?? 0);

    const { status, trigger } = computeComponentStatus(
      currentHours,
      currentFlights,
      currentDays,
      { hour: limitHour, flight: limitFlight, day: limitDay }
    );

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
      last_maintenance_date: lastMaintDate,
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

    // limits
    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);
    const cycleType = comp.maintenance_cycle || "NONE";

    // current usage from columns
    const prevHours = Number(comp.current_maintenance_hours ?? 0);
    const prevFlights = Number(comp.current_maintenance_flights ?? 0);
    const prevLifetimeHours = comp.current_usage_hours ?? 0;

    // Adding new usage
    const newHours = prevHours + (upd.add_hours || 0);
    const newFlights = prevFlights + (upd.add_flights || 0);
    const newLifetimeHours = prevLifetimeHours + (upd.add_hours || 0);

    const now = new Date().toISOString();

    // Days resets to 0 because we set last_maintenance_date to now
    const newDays = 0;

    const { error: updateErr } = await supabase
      .from("tool_component")
      .update({
        current_maintenance_hours: newHours,
        current_maintenance_flights: newFlights,
        current_maintenance_days: newDays,
        current_usage_hours: newLifetimeHours,
        last_maintenance_date: now,
        component_metadata: {
          ...meta,
          last_mission_id: missionId,
          last_maintenance_update: now,
        },
      })
      .eq("component_id", upd.component_id);

    if (updateErr) continue;

    const { status, trigger } = computeComponentStatus(
      newHours,
      newFlights,
      newDays,
      { hour: limitHour, flight: limitFlight, day: limitDay }
    );

    updatedComponents.push({
      component_id: comp.component_id,
      component_type: comp.component_type,
      component_code: comp.component_code || comp.component_name,
      serial_number: comp.serial_number,
      current_hours: newHours,
      current_flights: newFlights,
      current_days: newDays,
      limit_hour: limitHour,
      limit_flight: limitFlight,
      limit_day: limitDay,
      maintenance_cycle_type: cycleType,
      last_maintenance_date: now,
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
  const { data: components } = await supabase
    .from("tool_component")
    .select("component_id, current_usage_hours, installation_date, component_metadata")
    .eq("fk_tool_id", toolId)
    .eq("component_active", "Y");

  if (!components || components.length === 0) return "OK";

  const modelIds = [
    ...new Set(
      components
        .map((c: any) => c.component_metadata?.fk_tool_model_id)
        .filter(Boolean)
    ),
  ];

  let modelsMap: Record<number, any> = {};
  if (modelIds.length > 0) {
    const { data: models } = await supabase
      .from("tool_model")
      .select("model_id, specifications")
      .in("model_id", modelIds);
    for (const m of models || []) {
      modelsMap[m.model_id] = m;
    }
  }

  let worst: MaintenanceStatus = "OK";

  for (const comp of components) {
    const meta = (comp as any).component_metadata || {};
    const modelId = meta.fk_tool_model_id;
    const model = modelId ? modelsMap[modelId] : null;
    const specs = model?.specifications || {};

    const cycleHour = Number(specs.maintenance_cycle_hour ?? 0);
    const cycleFlight = Number(specs.maintenance_cycle_flight ?? 0);
    const cycleDay = Number(specs.maintenance_cycle_day ?? 0);

    const totalHours = (comp as any).current_usage_hours ?? 0;
    const totalFlights = meta.maintenance_flights ?? 0;
    const lastMaint = (comp as any).installation_date ?? null;

    const { status } = computeComponentStatus(
      totalHours,
      totalFlights,
      lastMaint,
      { hour: cycleHour, flight: cycleFlight, day: cycleDay }
    );

    if (status === "DUE") { worst = "DUE"; break; }
    if (status === "ALERT") worst = "ALERT";
  }

  return worst;
}
