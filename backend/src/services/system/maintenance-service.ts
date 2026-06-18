import { prisma } from "@/lib/prisma";
import { refreshMaintenanceDays } from "@/backend/utils/refresh-maintenance-days";
import {
  MaintenanceComponent,
  MaintenanceDashboardQuery,
  MaintenanceDrone,
  MaintenanceModel,
  MaintenanceStatus,
} from "@/config/types/maintenance";


function parseComponentMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return JSON.parse(parsed);
      return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
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
  const { owner_id, threshold_alert } = params;

  const rawTools = await prisma.tool.findMany({
    where: {
      tool_active: "Y",
      ...(owner_id > 0 && { fk_owner_id: owner_id }),
    },
    select: {
      tool_id: true,
      tool_code: true,
      tool_name: true,
      tool_description: true,
      fk_owner_id: true,
      fk_model_id: true,
      tool_metadata: true,
      tool_model: {
        select: {
          model_id: true,
          manufacturer: true,
          model_name: true,
          specifications: true,
        },
      },
    },
  });

  if (!rawTools || rawTools.length === 0) return [];

  const tools = rawTools.filter(
    (t) =>
      (t.tool_metadata as any)?.deleted !== true &&
      (t.tool_metadata as any)?.is_warehouse !== true
  );
  if (tools.length === 0) return [];

  const toolIds = tools.map((t) => t.tool_id);

  await refreshMaintenanceDays(toolIds);

  const openTickets = await prisma.maintenance_ticket.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      ticket_status: { not: 'CLOSED' },
    },
    select: { fk_tool_id: true, fk_component_id: true },
  });

  const toolsInMaintenance = new Set<number>(
    openTickets.filter((t) => t.fk_tool_id != null).map((t) => t.fk_tool_id!)
  );
  const componentsInMaintenance = new Set<number>(
    openTickets
      .filter((t) => t.fk_component_id != null)
      .map((t) => t.fk_component_id!)
  );

  const maintenanceRecords = await prisma.tool_maintenance.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      maintenance_status: 'COMPLETED',
    },
    select: { fk_tool_id: true, completed_date: true },
    orderBy: { completed_date: 'desc' },
  });

  const lastMaintenanceMap: Record<number, string> = {};
  for (const rec of maintenanceRecords) {
    if (!lastMaintenanceMap[rec.fk_tool_id] && rec.completed_date) {
      lastMaintenanceMap[rec.fk_tool_id] = rec.completed_date.toISOString().slice(0, 10);
    }
  }

  const missionStats = await prisma.pilot_mission.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      actual_end: { not: null },
    },
    select: { fk_tool_id: true, flight_duration: true },
  });

  const statsMap: Record<number, { totalHours: number; totalFlights: number }> = {};
  for (const stat of missionStats) {
    if (stat.fk_tool_id == null) continue;
    if (!statsMap[stat.fk_tool_id]) {
      statsMap[stat.fk_tool_id] = { totalHours: 0, totalFlights: 0 };
    }
    statsMap[stat.fk_tool_id].totalHours += (stat.flight_duration ?? 0) / 60;
    statsMap[stat.fk_tool_id].totalFlights += 1;
  }

  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      component_active: 'Y',
    },
    select: {
      component_id: true,
      fk_tool_id: true,
      component_code: true,
      component_name: true,
      component_type: true,
      serial_number: true,
      installation_date: true,
      maintenance_cycle_hour: true,
      maintenance_cycle_flight: true,
      maintenance_cycle_day: true,
      current_maintenance_hours: true,
      current_maintenance_days: true,
      current_maintenance_flights: true,
      last_maintenance_date: true,
      component_metadata: true,
    },
  });

  const compsByTool: Record<number, MaintenanceComponent[]> = {};

  for (const rawComp of components) {
    const meta = parseComponentMeta(rawComp.component_metadata);
    if (meta.system_detached === true) continue;
    if (meta.component_status === "DECOMMISSIONED") continue;

    const compModel: MaintenanceModel = {
      factory_serie: null,
      factory_model: rawComp.component_name,
      maintenance_cycle_hour: Number(rawComp.maintenance_cycle_hour ?? 0),
      maintenance_cycle_flight: Number(rawComp.maintenance_cycle_flight ?? 0),
      maintenance_cycle_day: Number(rawComp.maintenance_cycle_day ?? 0),
    };
    const lastMaint = rawComp.last_maintenance_date?.toISOString() ?? null;

    const compHours = Number(rawComp.current_maintenance_hours ?? 0);
    const compFlights = Number(rawComp.current_maintenance_flights ?? 0);
    const compDays = Number(rawComp.current_maintenance_days ?? 0);

    const computed = computeStatus(compHours, compFlights, compDays, compModel, threshold_alert);

    const compStatus: MaintenanceStatus = componentsInMaintenance.has(rawComp.component_id)
      ? "IN_MAINTENANCE"
      : computed.status;

    const compEntry: MaintenanceComponent = {
      tool_component_id: rawComp.component_id,
      component_name: rawComp.component_name,
      component_type: rawComp.component_type,
      serial_number: rawComp.serial_number,
      last_maintenance: lastMaint,
      activation_date: rawComp.installation_date?.toISOString().slice(0, 10) ?? null,
      total_hours: compHours,
      total_flights: compFlights,
      total_days: compDays,
      status: compStatus,
      trigger: computed.trigger,
      model: compModel,
    };

    if (!compsByTool[rawComp.fk_tool_id]) compsByTool[rawComp.fk_tool_id] = [];
    compsByTool[rawComp.fk_tool_id].push(compEntry);
  }

  const result: MaintenanceDrone[] = tools.map((tool) => {
    const toolId = tool.tool_id;
    const model = extractModel(tool.tool_model as Record<string, unknown> | null);
    const stats = statsMap[toolId] ?? { totalHours: 0, totalFlights: 0 };
    const lastMaint = lastMaintenanceMap[toolId] ?? null;
    const droneDays = lastMaint
      ? Math.floor((Date.now() - new Date(lastMaint).getTime()) / 86400000)
      : 0;

    const computed = computeStatus(stats.totalHours, stats.totalFlights, droneDays, model, threshold_alert);

    const droneStatus: MaintenanceStatus = toolsInMaintenance.has(toolId)
      ? "IN_MAINTENANCE"
      : computed.status;

    const toolMeta = (tool.tool_metadata ?? {}) as Record<string, unknown>;
    return {
      tool_id: toolId,
      code: String(tool.tool_code ?? `#${toolId}`),
      serial_number: String(tool.tool_name ?? ""),
      description: tool.tool_description ?? null,
      last_maintenance: lastMaint,
      activation_date: (toolMeta.activationDate as string | null) ?? null,
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
