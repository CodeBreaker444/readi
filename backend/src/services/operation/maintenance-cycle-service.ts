/**
 * Mission -> component maintenance counters.
 *
 * This file only loads / saves data. The rules (how hours & flights are added, battery ratio,
 * ALERT/DUE thresholds) live in:
 *   - mission-maintenance-rules.ts   (pure mission math / response shapes)
 *   - ../system/maintenance-rules.ts (pure HH.MM math + status thresholds)
 * The board-level tool status lives in tool-maintenance-status.ts.
 */
import { prisma } from '@/lib/prisma';
import { refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import {
  CycleStatus,
  getBatteryCycleRatio,
  parseComponentMeta,
  subtractHhmmHours,
} from '@/backend/services/system/maintenance-rules';
import {
  ComponentMaintenanceInfo,
  buildComponentMaintenanceInfo,
  buildMissionComponentPayload,
  computeMissionUsage,
  evaluateComponent,
  readComponentCounters,
  readComponentLimits,
  worstStatus,
} from './mission-maintenance-rules';

interface UpdateComponentInput {
  component_id: number;
  add_flights: number;
  add_hours: number;
  manual_cycles_input?: boolean;
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: CycleStatus;
  components: ComponentMaintenanceInfo[];
}

const COMPONENT_CYCLE_SELECT = {
  component_id: true,
  component_type: true,
  component_code: true,
  component_name: true,
  serial_number: true,
  current_usage_hours: true,
  installation_date: true,
  component_metadata: true,
  maintenance_cycle: true,
  maintenance_cycle_hour: true,
  maintenance_cycle_day: true,
  maintenance_cycle_flight: true,
  current_maintenance_hours: true,
  current_maintenance_days: true,
  current_maintenance_flights: true,
  last_maintenance_date: true,
} as const;

export async function getComponentsForMaintenanceCycle(
  toolId: number,
  ownerId: number
): Promise<SystemData> {
  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_id: true, tool_code: true, tool_name: true },
  });

  if (!tool) throw new Error('System not found or unauthorized');

  await refreshMaintenanceDaysForTool(toolId);

  const comps = await prisma.tool_component.findMany({
    where: { fk_tool_id: toolId, component_active: 'Y' },
    select: COMPONENT_CYCLE_SELECT,
  });

  const components: ComponentMaintenanceInfo[] = [];
  let systemStatus: CycleStatus = 'OK';

  for (const comp of comps) {
    const limits = readComponentLimits(comp);
    const counters = readComponentCounters(comp);
    const batteryCycleRatio = getBatteryCycleRatio(parseComponentMeta(comp.component_metadata));

    const evaluation = evaluateComponent(counters, limits);
    systemStatus = worstStatus(systemStatus, evaluation.status);

    components.push(buildComponentMaintenanceInfo(comp, counters, limits, evaluation, batteryCycleRatio));
  }

  return {
    tool_id: tool.tool_id,
    tool_code: tool.tool_code ?? '',
    tool_name: tool.tool_name ?? '',
    system_status: systemStatus,
    components,
  };
}


export interface MissionMaintenanceLogEntry {
  component_id: number;
  component_code: string | null;
  add_hours: number;
  add_flights: number;
  applied_at: string;
}

export async function getMissionMaintenanceLog(missionId: number): Promise<MissionMaintenanceLogEntry[]> {
  const rows = await prisma.mission_maintenance_log.findMany({
    where: { fk_mission_id: missionId },
    select: {
      add_hours: true,
      add_flights: true,
      created_at: true,
      fk_component_id: true,
      tool_component: { select: { component_code: true, component_name: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  return rows.map((r) => ({
    component_id: r.fk_component_id,
    component_code: r.tool_component.component_code || r.tool_component.component_name,
    add_hours: Number(r.add_hours),
    add_flights: Number(r.add_flights),
    applied_at: r.created_at.toISOString(),
  }));
}

/**
 * Reverses the maintenance hours/flights this mission previously recorded on
 * its components (used when a mission is deleted). Removes the log entries
 * once applied so a later delete of the same mission is a no-op.
 */
export async function revertMissionMaintenance(missionId: number, ownerId: number): Promise<{ reverted: number }> {
  const rows = await prisma.mission_maintenance_log.findMany({
    where: { fk_mission_id: missionId, tool_component: { tool: { fk_owner_id: ownerId } } },
    select: { mission_maintenance_log_id: true, fk_component_id: true, add_hours: true, add_flights: true },
  });

  if (rows.length === 0) return { reverted: 0 };

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const comp = await tx.tool_component.findUnique({
        where: { component_id: row.fk_component_id },
        select: { current_maintenance_hours: true, current_maintenance_flights: true, current_usage_hours: true },
      });
      if (!comp) continue;

      const addHours = Number(row.add_hours);
      const addFlights = Number(row.add_flights);

      const revertedHours = subtractHhmmHours(Number(comp.current_maintenance_hours ?? 0), addHours);
      const revertedFlights = Math.max(0, Math.round((Number(comp.current_maintenance_flights ?? 0) - addFlights) * 100) / 100);
      const revertedLifetimeHours = subtractHhmmHours(Number(comp.current_usage_hours ?? 0), addHours);

      await tx.tool_component.update({
        where: { component_id: row.fk_component_id },
        data: {
          current_maintenance_hours: revertedHours,
          current_maintenance_flights: revertedFlights,
          current_usage_hours: revertedLifetimeHours,
        },
      });
    }

    await tx.mission_maintenance_log.deleteMany({
      where: { mission_maintenance_log_id: { in: rows.map((r) => r.mission_maintenance_log_id) } },
    });
  });

  return { reverted: rows.length };
}

export async function updateComponentMaintenanceCycle(
  toolId: number,
  missionId: number,
  ownerId: number,
  updates: UpdateComponentInput[]
): Promise<{ code: number; message: string; components: ComponentMaintenanceInfo[]; alreadyApplied?: boolean }> {
  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  if (!tool) throw new Error('System not found or unauthorized');

  const existingLog = await prisma.mission_maintenance_log.findFirst({
    where: { fk_mission_id: missionId },
    select: { mission_maintenance_log_id: true },
  });

  if (existingLog) {
    return {
      code: 0,
      message: 'Maintenance has already been recorded for this mission and cannot be updated again.',
      components: [],
      alreadyApplied: true,
    };
  }

  await refreshMaintenanceDaysForTool(toolId);

  const results = await Promise.all(
    updates.map(async (upd): Promise<ComponentMaintenanceInfo | null> => {
      const comp = await prisma.tool_component.findFirst({
        where: { component_id: upd.component_id, fk_tool_id: toolId },
        select: COMPONENT_CYCLE_SELECT,
      });

      if (!comp) return null;

      const meta = parseComponentMeta(comp.component_metadata);
      const limits = readComponentLimits(comp);
      const counters = readComponentCounters(comp);

      const usage = computeMissionUsage({
        prevHours: counters.hours,
        prevFlights: counters.flights,
        prevLifetimeHours: Number(comp.current_usage_hours ?? 0),
        meta,
        addHours: upd.add_hours,
        addFlights: upd.add_flights,
        manualCyclesInput: upd.manual_cycles_input,
      });

      const updated = await prisma.tool_component.updateMany({
        where: { component_id: upd.component_id, fk_tool_id: toolId },
        data: buildMissionComponentPayload(usage, meta, missionId, new Date()),
      });

      if (updated.count === 0) {
        console.error(`[maintenance-cycle] update failed for component ${upd.component_id}`);
        return null;
      }

      await prisma.mission_maintenance_log.create({
        data: {
          fk_mission_id: missionId,
          fk_component_id: upd.component_id,
          add_hours: upd.add_hours || 0,
          add_flights: upd.add_flights || 0,
        },
      });

      const after = { hours: usage.finalHours, flights: usage.finalFlights, days: counters.days };
      const evaluation = evaluateComponent(after, limits);

      return buildComponentMaintenanceInfo(comp, after, limits, evaluation, usage.batteryCycleRatio);
    })
  );

  return {
    code: 1,
    message: 'Maintenance tracking updated successfully',
    components: results.filter((r): r is ComponentMaintenanceInfo => r !== null),
  };
}
