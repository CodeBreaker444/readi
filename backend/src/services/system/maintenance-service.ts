import { supabase } from "@/backend/database/database";
import { refreshMaintenanceDays } from "@/backend/utils/refresh-maintenance-days";
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
  currentHours: number,
  currentFlights: number,
  currentDays: number,
  model: MaintenanceModel,
  threshold: number
): { status: MaintenanceStatus; trigger: (string | null)[] } {
  const triggers: (string | null)[] = [null, null, null];
  let worst = "OK" as MaintenanceStatus;

  if (model.maintenance_cycle_hour > 0) {
    const pct = (currentHours / model.maintenance_cycle_hour) * 100;
    if (pct >= 100) { triggers[0] = "HOUR"; worst = "DUE"; }
    else if (pct >= threshold && worst !== "DUE") { triggers[0] = "HOUR"; worst = "ALERT"; }
  }

  if (model.maintenance_cycle_flight > 0) {
    const pct = (currentFlights / model.maintenance_cycle_flight) * 100;
    if (pct >= 100) { triggers[1] = "FLIGHT"; worst = "DUE"; }
    else if (pct >= threshold && worst !== "DUE") { triggers[1] = "FLIGHT"; worst = "ALERT"; }
  }

  if (model.maintenance_cycle_day > 0) {
    const pct = (currentDays / model.maintenance_cycle_day) * 100;
    if (pct >= 100) { triggers[2] = "DAY"; worst = "DUE"; }
    else if (pct >= threshold && worst !== "DUE") { triggers[2] = "DAY"; worst = "ALERT"; }
  }

  return { status: worst, trigger: triggers };
}

function extractModel(rawModel: Record<string, unknown> | null): MaintenanceModel {
  if (!rawModel) {
    return {
      factory_serie: null,
      factory_model: null,
      maintenance_cycle_hour: 0,
      maintenance_cycle_flight: 0,
      maintenance_cycle_day: 0,
    };
  }
  const specs = (rawModel.specifications ?? {}) as Record<string, number>;

  return {
    factory_serie: String(rawModel.manufacturer ?? ""),
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
    fk_owner_id,
    fk_model_id,
    tool_model (
      model_id,
      manufacturer,
      model_name,
      specifications
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

  await refreshMaintenanceDays(toolIds);

  // Detecting tools and components with open (non-closed) maintenance tickets
  const { data: openTickets } = await supabase
    .from('maintenance_ticket')
    .select('fk_tool_id, fk_component_id')
    .in('fk_tool_id', toolIds)
    .neq('ticket_status', 'CLOSED');

  const toolsInMaintenance = new Set<number>(
    (openTickets ?? []).map((t: { fk_tool_id: number }) => t.fk_tool_id)
  );
  const componentsInMaintenance = new Set<number>(
    (openTickets ?? [])
      .filter((t: { fk_component_id: number | null }) => t.fk_component_id != null)
      .map((t: { fk_component_id: number }) => t.fk_component_id)
  );

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
    .select("fk_tool_id, flight_duration")
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
      component_code,
      component_name,
      component_type,
      serial_number,
      installation_date,
      maintenance_cycle_hour,
      maintenance_cycle_flight,
      maintenance_cycle_day,
      current_maintenance_hours,
      current_maintenance_days,
      current_maintenance_flights,
      last_cycle_updated_at
    `)
    .in("fk_tool_id", toolIds)
    .eq("component_active", "Y");

  const compsByTool: Record<number, MaintenanceComponent[]> = {};

  for (const rawComp of components ?? []) {
    const comp = rawComp as {
      component_id: number;
      fk_tool_id: number;
      component_code: string | null;
      component_name: string;
      component_type: string | null;
      serial_number: string | null;
      installation_date: string | null;
      maintenance_cycle_hour: number | null;
      maintenance_cycle_flight: number | null;
      maintenance_cycle_day: number | null;
      current_maintenance_hours: number | null;
      current_maintenance_days: number | null;
      current_maintenance_flights: number | null;
      last_cycle_updated_at: string | null;
    };

    const compModel: MaintenanceModel = {
      // factory_type: comp.component_type,
      factory_serie: null,
      factory_model: comp.component_name,
      maintenance_cycle_hour: Number(comp.maintenance_cycle_hour ?? 0),
      maintenance_cycle_flight: Number(comp.maintenance_cycle_flight ?? 0),
      maintenance_cycle_day: Number(comp.maintenance_cycle_day ?? 0),
    };
    const lastMaint = comp.last_cycle_updated_at ?? comp.installation_date ?? null;

    const compHours = Number(comp.current_maintenance_hours ?? 0);
    const compFlights = Number(comp.current_maintenance_flights ?? 0);
    const compDays = Number(comp.current_maintenance_days ?? 0);

    const computed = computeStatus(
      compHours,
      compFlights,
      compDays,
      compModel,
      threshold_alert
    );

    const compStatus: MaintenanceStatus = componentsInMaintenance.has(comp.component_id)
      ? "IN_MAINTENANCE"
      : computed.status;

    const compEntry: MaintenanceComponent = {
      tool_component_id: comp.component_id,
      component_name: comp.component_name,
      component_type: comp.component_type,
      serial_number: comp.serial_number,
      last_maintenance: lastMaint,
      total_hours: compHours,
      total_flights: compFlights,
      total_days: compDays,
      status: compStatus,
      trigger: computed.trigger,
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
    const droneDays = lastMaint
      ? Math.floor((Date.now() - new Date(lastMaint).getTime()) / 86400000)
      : 0;

    const computed = computeStatus(
      stats.totalHours,
      stats.totalFlights,
      droneDays,
      model,
      threshold_alert
    );

    const droneStatus: MaintenanceStatus = toolsInMaintenance.has(toolId)
      ? "IN_MAINTENANCE"
      : computed.status;

    return {
      tool_id: toolId,
      code: String(tool.tool_code ?? `#${toolId}`),
      serial_number: String(tool.tool_name ?? ""),
      last_maintenance: lastMaint,
      total_hours: Math.round(stats.totalHours * 100) / 100,
      total_flights: stats.totalFlights,
      status: droneStatus,
      trigger: computed.trigger,
      model,
      components: compsByTool[toolId] ?? [],
    };
  });

  return result;
}
