/**
 * Overall maintenance status of tools (OK / ALERT / DUE / IN_MAINTENANCE) for the operation board.
 * The threshold logic itself lives in maintenance-rules.ts (computeComponentStatus).
 */
import { prisma } from '@/lib/prisma';
import { refreshMaintenanceDays } from '@/backend/utils/refresh-maintenance-days';
import { MaintenanceStatus } from '@/config/types/maintenance';
import { computeComponentStatus } from '@/backend/services/system/maintenance-rules';
import { readComponentCounters, readComponentLimits } from './mission-maintenance-rules';

export async function getToolMaintenanceStatus(toolId: number): Promise<MaintenanceStatus> {
  const statusMap = await getToolMaintenanceStatusBatch([toolId]);
  return statusMap[toolId] ?? 'OK';
}

/**
 * Batched form of getToolMaintenanceStatus: resolves maintenance status for many tools
 * with a fixed number of queries instead of ~3 sequential queries per tool.
 */
export async function getToolMaintenanceStatusBatch(toolIds: number[]): Promise<Record<number, MaintenanceStatus>> {
  const result: Record<number, MaintenanceStatus> = {};
  if (toolIds.length === 0) return result;

  const openTickets = await prisma.maintenance_ticket.findMany({
    where: { fk_tool_id: { in: toolIds }, NOT: { ticket_status: 'CLOSED' } },
    select: { fk_tool_id: true },
  });
  const inMaintenanceSet = new Set(openTickets.map((t) => t.fk_tool_id));

  const remainingToolIds = toolIds.filter((id) => !inMaintenanceSet.has(id));

  if (remainingToolIds.length > 0) {
    await refreshMaintenanceDays(remainingToolIds);
  }

  const components = remainingToolIds.length > 0
    ? await prisma.tool_component.findMany({
        where: { fk_tool_id: { in: remainingToolIds }, component_active: 'Y' },
        select: {
          fk_tool_id: true,
          maintenance_cycle: true,
          maintenance_cycle_hour: true,
          maintenance_cycle_day: true,
          maintenance_cycle_flight: true,
          current_maintenance_hours: true,
          current_maintenance_days: true,
          current_maintenance_flights: true,
        },
      })
    : [];

  const componentsByTool = new Map<number, typeof components>();
  for (const comp of components) {
    const arr = componentsByTool.get(comp.fk_tool_id) ?? [];
    arr.push(comp);
    componentsByTool.set(comp.fk_tool_id, arr);
  }

  for (const toolId of toolIds) {
    if (inMaintenanceSet.has(toolId)) {
      result[toolId] = 'IN_MAINTENANCE';
      continue;
    }

    const toolComponents = componentsByTool.get(toolId);
    if (!toolComponents || toolComponents.length === 0) {
      result[toolId] = 'OK';
      continue;
    }

    let worst: MaintenanceStatus = 'OK';

    for (const comp of toolComponents) {
      const cycleType = comp.maintenance_cycle || 'NONE';
      if (cycleType === 'NONE') continue;

      const counters = readComponentCounters(comp);
      const { status } = computeComponentStatus(
        counters.hours, counters.flights, counters.days,
        readComponentLimits(comp)
      );

      if (status === 'DUE') { worst = 'DUE'; break; }
      if (status === 'ALERT') worst = 'ALERT';
    }

    result[toolId] = worst;
  }

  return result;
}
