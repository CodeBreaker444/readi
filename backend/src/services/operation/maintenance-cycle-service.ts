import { supabase } from "@/backend/database/database";
import { MaintenanceStatus } from "@/config/types/maintenance";


function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function computeComponentStatus(
  totalHours: number,
  totalFlights: number,
  lastMaintenanceDate: string | null,
  cycle: { hour: number; flight: number; day: number },
  thresholdPct = 0.8
): { status: MaintenanceStatus; trigger: string[] } {
  const triggers: string[] = [];
  let isDue = false;
  let isAlert = false;

  if (cycle.hour > 0) {
    const ratio = totalHours / cycle.hour;
    if (ratio >= 1) { isDue = true; triggers.push("HOUR"); }
    else if (ratio >= thresholdPct) { isAlert = true; triggers.push("HOUR"); }
  }

  if (cycle.flight > 0) {
    const ratio = totalFlights / cycle.flight;
    if (ratio >= 1) { isDue = true; triggers.push("FLIGHT"); }
    else if (ratio >= thresholdPct) { isAlert = true; triggers.push("FLIGHT"); }
  }

  if (cycle.day > 0 && lastMaintenanceDate) {
    const daysUsed = daysBetween(new Date(lastMaintenanceDate), new Date());
    const ratio = daysUsed / cycle.day;
    if (ratio >= 1) { isDue = true; triggers.push("DAY"); }
    else if (ratio >= thresholdPct) { isAlert = true; triggers.push("DAY"); }
  }

  const status: MaintenanceStatus = isDue ? "DUE" : isAlert ? "ALERT" : "OK";
  return { status, trigger: triggers };
}


export interface ComponentMaintenanceInfo {
  component_id: number;
  component_type: string | null;
  component_code: string | null;
  serial_number: string | null;
  total_hours: number;
  total_flights: number;
  days_since_maintenance: number | null;
  maintenance_cycle_hour: number;
  maintenance_cycle_flight: number;
  maintenance_cycle_day: number;
  maintenance_cycle_type: string;
  status: MaintenanceStatus;
  trigger: string[];
}

export interface SystemMaintenanceData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: MaintenanceStatus;
  components: ComponentMaintenanceInfo[];
}

export interface UpdateComponentInput {
  component_id: number;
  add_flights: number;
  add_hours: number;
  add_days: number;
}


export async function getComponentsForMaintenanceCycle(
  toolId: number,
  ownerId: number
): Promise<SystemMaintenanceData> {
  console.log("[maint-cycle] fetching tool", toolId, "owner", ownerId);

  const { data: tool, error: toolErr } = await supabase
    .from("tool")
    .select("tool_id, tool_code, tool_name, fk_model_id, tool_metadata")
    .eq("tool_id", toolId)
    .eq("fk_owner_id", ownerId)
    .maybeSingle();

  if (toolErr) {
    console.error("[maint-cycle] tool query error:", toolErr);
    throw new Error(`Tool query failed: ${toolErr.message}`);
  }
  if (!tool) {
    console.error("[maint-cycle] tool not found for id", toolId, "owner", ownerId);
    throw new Error("System not found or unauthorized");
  }

  console.log("[maint-cycle] tool found:", tool.tool_code);

  const { data: rawComponents, error: compErr } = await supabase
    .from("tool_component")
    .select(`
      component_id,
      fk_tool_id,
      component_code,
      component_type,
      component_name,
      serial_number,
      current_usage_hours,
      installation_date,
      expected_lifespan_hours,
      component_metadata
    `)
    .eq("fk_tool_id", toolId)
    .eq("component_active", "Y");

  if (compErr) {
    console.error("[maint-cycle] component query error:", compErr);
    throw new Error(`Failed to fetch components: ${compErr.message}`);
  }

  const components = (rawComponents || []).filter(
    (c: any) => c.component_metadata?.system_detached !== true
  );

  console.log("[maint-cycle] found", components.length, "components");

  const modelIds = [
    ...new Set(
      (components || [])
        .map((c: any) => c.component_metadata?.fk_tool_model_id)
        .filter(Boolean)
    ),
  ];

  let modelsMap: Record<number, any> = {};
  if (modelIds.length > 0) {
    const { data: models } = await supabase
      .from("tool_model")
      .select("model_id, model_name, manufacturer, model_code, specifications")
      .in("model_id", modelIds);

    for (const m of models || []) {
      modelsMap[m.model_id] = m;
    }
  }

  let toolModel: any = null;
  if (tool.fk_model_id) {
    const { data: tm } = await supabase
      .from("tool_model")
      .select("model_id, specifications")
      .eq("model_id", tool.fk_model_id)
      .maybeSingle();
    toolModel = tm;
  }

  const compIds = (components || []).map((c: any) => c.component_id);
  let compLastMaintMap: Record<number, string> = {};

  if (compIds.length > 0) {
    const { data: maintRecords } = await supabase
      .from("tool_maintenance")
      .select("fk_tool_id, completed_date")
      .in("fk_tool_id", compIds)
      .eq("maintenance_status", "COMPLETED")
      .order("completed_date", { ascending: false });

    for (const rec of maintRecords || []) {
      const r = rec as { fk_tool_id: number; completed_date: string };
      if (!compLastMaintMap[r.fk_tool_id]) {
        compLastMaintMap[r.fk_tool_id] = r.completed_date;
      }
    }
  }

  let worstStatus: MaintenanceStatus = "OK";

  const componentInfos: ComponentMaintenanceInfo[] = (components || []).map(
    (comp: any) => {
      const meta = comp.component_metadata || {};
      const modelId = meta.fk_tool_model_id;
      const model = modelId ? modelsMap[modelId] : null;
      const specs = model?.specifications || {};

      const cycleHour = Number(specs.maintenance_cycle_hour ?? 0);
      const cycleFlight = Number(specs.maintenance_cycle_flight ?? 0);
      const cycleDay = Number(specs.maintenance_cycle_day ?? 0);

      let cycleType = "NONE";
      const hasCycles = [cycleHour > 0, cycleFlight > 0, cycleDay > 0];
      const activeCount = hasCycles.filter(Boolean).length;
      if (activeCount > 1) cycleType = "MIXED";
      else if (cycleHour > 0) cycleType = "HOURS";
      else if (cycleFlight > 0) cycleType = "FLIGHTS";
      else if (cycleDay > 0) cycleType = "DAYS";

      const totalHours = comp.current_usage_hours ?? 0;
      const totalFlights = meta.maintenance_flights ?? 0;
      const lastMaint =
        compLastMaintMap[comp.component_id] ??
        comp.installation_date ??
        null;

      const daysSince = lastMaint
        ? daysBetween(new Date(lastMaint), new Date())
        : null;

      const { status, trigger } = computeComponentStatus(
        totalHours,
        totalFlights,
        lastMaint,
        { hour: cycleHour, flight: cycleFlight, day: cycleDay }
      );

      if (status === "DUE") worstStatus = "DUE";
      else if (status === "ALERT" && worstStatus !== "DUE")
        worstStatus = "ALERT";

      return {
        component_id: comp.component_id,
        component_type: comp.component_type,
        component_code: comp.component_code || comp.component_name,
        serial_number: comp.serial_number,
        total_hours: totalHours,
        total_flights: totalFlights,
        days_since_maintenance: daysSince,
        maintenance_cycle_hour: cycleHour,
        maintenance_cycle_flight: cycleFlight,
        maintenance_cycle_day: cycleDay,
        maintenance_cycle_type: cycleType,
        status,
        trigger,
      };
    }
  );

  return {
    tool_id: toolId,
    tool_code: tool.tool_code ?? `#${toolId}`,
    tool_name: tool.tool_name ?? "",
    system_status: worstStatus,
    components: componentInfos,
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
      .select("component_id, fk_tool_id, component_type, component_code, component_name, serial_number, current_usage_hours, installation_date, component_metadata")
      .eq("component_id", upd.component_id)
      .eq("fk_tool_id", toolId)
      .maybeSingle();

    if (compErr || !comp) continue;

    const meta = comp.component_metadata || {};
    const prevFlights = meta.maintenance_flights ?? 0;
    const prevDays = meta.maintenance_days ?? 0;
    const prevHours = comp.current_usage_hours ?? 0;

    const newHours = prevHours + (upd.add_hours || 0);
    const newFlights = prevFlights + (upd.add_flights || 0);
    const newDays = prevDays + (upd.add_days || 0);

    const { error: updateErr } = await supabase
      .from("tool_component")
      .update({
        current_usage_hours: newHours,
        component_metadata: {
          ...meta,
          maintenance_flights: newFlights,
          maintenance_days: newDays,
          last_mission_id: missionId,
          last_maintenance_update: new Date().toISOString(),
        },
      })
      .eq("component_id", upd.component_id);

    if (updateErr) continue;

    const modelId = meta.fk_tool_model_id;
    let cycleHour = 0, cycleFlight = 0, cycleDay = 0;

    if (modelId) {
      const { data: model } = await supabase
        .from("tool_model")
        .select("specifications")
        .eq("model_id", modelId)
        .maybeSingle();

      if (model?.specifications) {
        cycleHour = Number(model.specifications.maintenance_cycle_hour ?? 0);
        cycleFlight = Number(model.specifications.maintenance_cycle_flight ?? 0);
        cycleDay = Number(model.specifications.maintenance_cycle_day ?? 0);
      }
    }

    const lastMaint = comp.installation_date ?? null;
    const daysSince = lastMaint
      ? daysBetween(new Date(lastMaint), new Date())
      : null;

    let cycleType = "NONE";
    const hasCycles = [cycleHour > 0, cycleFlight > 0, cycleDay > 0];
    const activeCount = hasCycles.filter(Boolean).length;
    if (activeCount > 1) cycleType = "MIXED";
    else if (cycleHour > 0) cycleType = "HOURS";
    else if (cycleFlight > 0) cycleType = "FLIGHTS";
    else if (cycleDay > 0) cycleType = "DAYS";

    const { status, trigger } = computeComponentStatus(
      newHours,
      newFlights,
      lastMaint,
      { hour: cycleHour, flight: cycleFlight, day: cycleDay }
    );

    updatedComponents.push({
      component_id: comp.component_id,
      component_type: comp.component_type,
      component_code: comp.component_code || comp.component_name,
      serial_number: comp.serial_number,
      total_hours: newHours,
      total_flights: newFlights,
      days_since_maintenance: daysSince,
      maintenance_cycle_hour: cycleHour,
      maintenance_cycle_flight: cycleFlight,
      maintenance_cycle_day: cycleDay,
      maintenance_cycle_type: cycleType,
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
