import { supabase } from "@/backend/database/database";
import {
    MaintenanceComponent,
    MaintenanceDashboardQuery,
    MaintenanceDrone,
    MaintenanceModel,
    MaintenanceStatus,
} from "@/config/types/maintenance";

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function computeStatus(
  totalHours: number,
  totalFlights: number,
  lastMaintenanceDate: string | null,
  model: {
    maintenance_cycle_hour: number;
    maintenance_cycle_flight: number;
    maintenance_cycle_day: number;
  },
  thresholdAlert: number
): { status: MaintenanceStatus; trigger: (string | null)[] } {
  const today = new Date();
  const triggers: string[] = [];
  let isDue = false;
  let isAlert = false;

  const pct = thresholdAlert / 100;

  if (model.maintenance_cycle_hour > 0) {
    const ratio = totalHours / model.maintenance_cycle_hour;
    if (ratio >= 1) { isDue = true; triggers.push("HOUR"); }
    else if (ratio >= pct) { isAlert = true; triggers.push("HOUR"); }
  }

  if (model.maintenance_cycle_flight > 0) {
    const ratio = totalFlights / model.maintenance_cycle_flight;
    if (ratio >= 1) { isDue = true; triggers.push("FLIGHT"); }
    else if (ratio >= pct) { isAlert = true; triggers.push("FLIGHT"); }
  }

  if (model.maintenance_cycle_day > 0 && lastMaintenanceDate) {
    const daysUsed = daysBetween(new Date(lastMaintenanceDate), today);
    const ratio = daysUsed / model.maintenance_cycle_day;
    if (ratio >= 1) { isDue = true; triggers.push("DAY"); }
    else if (ratio >= pct) { isAlert = true; triggers.push("DAY"); }
  }

  const status: MaintenanceStatus = isDue ? "DUE" : isAlert ? "ALERT" : "OK";
  const trigger: (string | null)[] = [
    triggers[0] ?? null,
    triggers[1] ?? null,
    triggers[2] ?? null,
  ];

  return { status, trigger };
}

function extractModel(rawModel: Record<string, unknown> | null): MaintenanceModel {
  if (!rawModel) {
    return {
      factory_type: null,
      factory_serie: null,
      factory_model: null,
      maintenance_cycle_hour: 0,
      maintenance_cycle_flight: 0,
      maintenance_cycle_day: 0,
    };
  }
  const specs = (rawModel.specifications ?? {}) as Record<string, number>;
  const toolType = rawModel.tool_type as Record<string, string> | null;
  return {
    factory_type: toolType?.tool_type_name ?? null,
    factory_serie: String(rawModel.model_name ?? ""),
    factory_model: String(rawModel.model_name ?? ""),
    maintenance_cycle_hour: Number(specs.maintenance_cycle_hour ?? 0),
    maintenance_cycle_flight: Number(specs.maintenance_cycle_flight ?? 0),
    maintenance_cycle_day: Number(specs.maintenance_cycle_day ?? 0),
  };
}

export async function getMaintenanceDashboard(
  params: MaintenanceDashboardQuery
): Promise<MaintenanceDrone[]> {
  const { owner_id, client_id, threshold_alert } = params;

  let toolQuery = supabase
    .from("tool")
    .select(`
      tool_id,
      tool_code,
      tool_serial_number,
      fk_owner_id,
      fk_model_id,
      tool_model (
        model_id,
        manufacturer,
        model_name,
        specifications,
        tool_type:fk_tool_type_id (
          tool_type_name,
          tool_type_code
        )
      )
    `)
    .eq("tool_active", "Y");

  if (owner_id > 0) toolQuery = toolQuery.eq("fk_owner_id", owner_id);

  if (client_id > 0) {
    const { data: clientTools } = await supabase
      .from("pilot_mission")
      .select("fk_tool_id, planning:fk_planning_id(fk_client_id)")
      .eq("planning.fk_client_id", client_id);

    const clientToolIds = [
      ...new Set(
        (clientTools ?? [])
          .map((r: { fk_tool_id: number }) => r.fk_tool_id)
          .filter(Boolean)
      ),
    ];

    if (clientToolIds.length === 0) return [];
    toolQuery = toolQuery.in("tool_id", clientToolIds);
  }

  const { data: tools, error: toolError } = await toolQuery;
  if (toolError) throw new Error(`Tools fetch failed: ${toolError.message}`);
  if (!tools || tools.length === 0) return [];

  const toolIds = tools.map((t: { tool_id: number }) => t.tool_id);

  const { data: maintenanceRecords } = await supabase
    .from("tool_maintenance")
    .select("fk_tool_id, completed_date")
    .in("fk_tool_id", toolIds)
    .eq("maintenance_status", "COMPLETED")
    .order("completed_date", { ascending: false });

  const lastMaintenanceMap: Record<number, string> = {};
  for (const rec of maintenanceRecords ?? []) {
    const r = rec as { fk_tool_id: number; completed_date: string };
    if (!lastMaintenanceMap[r.fk_tool_id]) {
      lastMaintenanceMap[r.fk_tool_id] = r.completed_date;
    }
  }

  const { data: missionStats } = await supabase
    .from("pilot_mission")
    .select("fk_tool_id, flight_duration, distance_flown")
    .in("fk_tool_id", toolIds)
    .not("actual_end", "is", null);

  const statsMap: Record<number, { totalHours: number; totalFlights: number }> = {};
  for (const stat of missionStats ?? []) {
    const s = stat as { fk_tool_id: number; flight_duration: number | null };
    if (!statsMap[s.fk_tool_id]) {
      statsMap[s.fk_tool_id] = { totalHours: 0, totalFlights: 0 };
    }
    statsMap[s.fk_tool_id].totalHours += (s.flight_duration ?? 0) / 60;
    statsMap[s.fk_tool_id].totalFlights += 1;
  }

  const { data: components } = await supabase
    .from("tool_component")
    .select(`
      component_id,
      fk_tool_id,
      component_type,
      serial_number,
      current_usage_hours,
      last_replacement_date,
      expected_lifespan_hours
    `)
    .in("fk_tool_id", toolIds)
    .eq("component_active", "Y");

  const componentIds = (components ?? []).map(
    (c: { component_id: number }) => c.component_id
  );

  const { data: compMaintenance } = componentIds.length > 0
    ? await supabase
        .from("tool_maintenance")
        .select("fk_tool_id, completed_date")
        .in("fk_tool_id", componentIds)
        .eq("maintenance_status", "COMPLETED")
        .order("completed_date", { ascending: false })
    : { data: [] };

  const compLastMaintMap: Record<number, string> = {};
  for (const rec of compMaintenance ?? []) {
    const r = rec as { fk_tool_id: number; completed_date: string };
    if (!compLastMaintMap[r.fk_tool_id]) {
      compLastMaintMap[r.fk_tool_id] = r.completed_date;
    }
  }

  const compsByTool: Record<number, MaintenanceComponent[]> = {};
  for (const rawComp of components ?? []) {
    const comp = rawComp as {
      component_id: number;
      fk_tool_id: number;
      component_type: string | null;
      serial_number: string | null;
      current_usage_hours: number | null;
      last_replacement_date: string | null;
      expected_lifespan_hours: number | null;
    };

    const compModel: MaintenanceModel = {
      factory_type: comp.component_type,
      factory_serie: null,
      factory_model: comp.component_type,
      maintenance_cycle_hour: comp.expected_lifespan_hours ?? 0,
      maintenance_cycle_flight: 0,
      maintenance_cycle_day: 0,
    };

    const compHours = comp.current_usage_hours ?? 0;
    const lastMaint =
      compLastMaintMap[comp.component_id] ?? comp.last_replacement_date ?? null;

    const { status, trigger } = computeStatus(
      compHours,
      0,
      lastMaint,
      compModel,
      threshold_alert
    );

    const compEntry: MaintenanceComponent = {
      tool_component_id: comp.component_id,
      component_type: comp.component_type,
      serial_number: comp.serial_number,
      last_maintenance: lastMaint,
      total_hours: compHours,
      total_flights: 0,
      status,
      trigger,
      model: compModel,
    };

    if (!compsByTool[comp.fk_tool_id]) compsByTool[comp.fk_tool_id] = [];
    compsByTool[comp.fk_tool_id].push(compEntry);
  }

  const result: MaintenanceDrone[] = tools.map((tool: Record<string, unknown>) => {
    const toolId = tool.tool_id as number;
    const model = extractModel(tool.tool_model as Record<string, unknown> | null);
    const stats = statsMap[toolId] ?? { totalHours: 0, totalFlights: 0 };
    const lastMaint = lastMaintenanceMap[toolId] ?? null;

    const { status, trigger } = computeStatus(
      stats.totalHours,
      stats.totalFlights,
      lastMaint,
      model,
      threshold_alert
    );

    return {
      tool_id: toolId,
      code: String(tool.tool_code ?? `#${toolId}`),
      serial_number: tool.tool_serial_number as string | null,
      last_maintenance: lastMaint,
      total_hours: Math.round(stats.totalHours * 100) / 100,
      total_flights: stats.totalFlights,
      status,
      trigger,
      model,
      components: compsByTool[toolId] ?? [],
    };
  });

  return result;
}