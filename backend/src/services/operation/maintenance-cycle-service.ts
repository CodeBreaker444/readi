import { prisma } from '@/lib/prisma';
import { refreshMaintenanceDaysForTool } from '@/backend/utils/refresh-maintenance-days';
import { MaintenanceStatus } from '@/config/types/maintenance';


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
  status: 'OK' | 'ALERT' | 'DUE';
  trigger: string[];
  battery_cycle_ratio: number;
}

interface SystemData {
  tool_id: number;
  tool_code: string;
  tool_name: string;
  system_status: 'OK' | 'ALERT' | 'DUE';
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
): { status: 'OK' | 'ALERT' | 'DUE'; trigger: string[] } {
  const trigger: string[] = [];
  let status: 'OK' | 'ALERT' | 'DUE' = 'OK';

  const checks = [
    ...(limits.hour > 0 ? [{ current: currentHours, limit: limits.hour, name: 'hours' }] : []),
    ...(limits.flight > 0 ? [{ current: currentFlights, limit: limits.flight, name: 'flights' }] : []),
    ...(limits.day > 0 ? [{ current: currentDays, limit: limits.day, name: 'days' }] : []),
  ];

  for (const c of checks) {
    const ratio = c.current / c.limit;
    if (ratio >= 1) {
      status = 'DUE';
      trigger.push(`${c.name} exceeded (${c.current}/${c.limit})`);
    } else if (ratio >= 0.8 && status !== 'DUE') {
      status = 'ALERT';
      trigger.push(`${c.name} approaching (${c.current}/${c.limit})`);
    }
  }

  return { status, trigger };
}


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
    select: {
      component_id: true,
      component_type: true,
      component_code: true,
      component_name: true,
      serial_number: true,
      current_usage_hours: true,
      installation_date: true,
      component_metadata: true,
      component_active: true,
      maintenance_cycle: true,
      maintenance_cycle_hour: true,
      maintenance_cycle_day: true,
      maintenance_cycle_flight: true,
      current_maintenance_hours: true,
      current_maintenance_days: true,
      current_maintenance_flights: true,
      last_maintenance_date: true,
    },
  });

  const components: ComponentMaintenanceInfo[] = [];
  let worstStatus: 'OK' | 'ALERT' | 'DUE' = 'OK';

  for (const comp of comps) {
    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);
    const cycleType = comp.maintenance_cycle || 'NONE';

    const currentHours = Number(comp.current_maintenance_hours ?? 0);
    const currentFlights = Number(comp.current_maintenance_flights ?? 0);
    const currentDays = Number(comp.current_maintenance_days ?? 0);

    const rawMeta = comp.component_metadata;
    let meta: Record<string, unknown> = {};
    if (rawMeta) {
      if (typeof rawMeta === 'string') {
        try { meta = JSON.parse(rawMeta); } catch { meta = {}; }
      } else if (typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
        meta = rawMeta as Record<string, unknown>;
      }
    }
    const batteryCycleRatio = typeof meta.battery_cycle_ratio === 'number' ? meta.battery_cycle_ratio : 1;

    const hasLimits = limitHour > 0 || limitFlight > 0 || limitDay > 0;
    const { status, trigger } = hasLimits
      ? computeComponentStatus(currentHours, currentFlights, currentDays, { hour: limitHour, flight: limitFlight, day: limitDay })
      : { status: 'OK' as const, trigger: [] };

    if (status === 'DUE') worstStatus = 'DUE';
    else if (status === 'ALERT' && worstStatus !== 'DUE') worstStatus = 'ALERT';

    components.push({
      component_id: comp.component_id,
      component_type: comp.component_type ?? null,
      component_code: comp.component_code || comp.component_name,
      serial_number: comp.serial_number ?? null,
      current_hours: currentHours,
      current_flights: currentFlights,
      current_days: currentDays,
      limit_hour: limitHour,
      limit_flight: limitFlight,
      limit_day: limitDay,
      maintenance_cycle_type: cycleType,
      last_maintenance_date: comp.last_maintenance_date?.toISOString() ?? null,
      status,
      trigger,
      battery_cycle_ratio: batteryCycleRatio,
    });
  }

  return {
    tool_id: tool.tool_id,
    tool_code: tool.tool_code ?? '',
    tool_name: tool.tool_name ?? '',
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
  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_id: true },
  });

  if (!tool) throw new Error('System not found or unauthorized');

  await refreshMaintenanceDaysForTool(toolId);

  const results = await Promise.all(
    updates.map(async (upd): Promise<ComponentMaintenanceInfo | null> => {
      const comp = await prisma.tool_component.findFirst({
        where: { component_id: upd.component_id, fk_tool_id: toolId },
        select: {
          component_id: true,
          component_type: true,
          component_code: true,
          component_name: true,
          serial_number: true,
          current_usage_hours: true,
          component_metadata: true,
          maintenance_cycle: true,
          maintenance_cycle_hour: true,
          maintenance_cycle_day: true,
          maintenance_cycle_flight: true,
          current_maintenance_hours: true,
          current_maintenance_days: true,
          current_maintenance_flights: true,
          last_maintenance_date: true,
        },
      });

      if (!comp) return null;

      const rawMeta = comp.component_metadata;
      let meta: Record<string, unknown> = {};
      if (rawMeta) {
        if (typeof rawMeta === 'string') {
          try { meta = JSON.parse(rawMeta); } catch { meta = {}; }
        } else if (typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
          meta = rawMeta as Record<string, unknown>;
        }
      }

      const cycleType = comp.maintenance_cycle || 'NONE';
      const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
      const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
      const limitDay = Number(comp.maintenance_cycle_day ?? 0);

      const prevHours = Number(comp.current_maintenance_hours ?? 0);
      const prevFlights = Number(comp.current_maintenance_flights ?? 0);
      const currentDays = Number(comp.current_maintenance_days ?? 0);
      const prevLifetimeHours = Number(comp.current_usage_hours ?? 0);

      const batteryCycleRatio = typeof meta.battery_cycle_ratio === 'number' ? meta.battery_cycle_ratio : 1;
      const effectiveFlightCycles = Math.round((upd.add_flights || 0) * batteryCycleRatio * 100) / 100;

      const newHours = addHhmmHours(prevHours, upd.add_hours || 0);
      const newFlights = Math.round((prevFlights + effectiveFlightCycles) * 100) / 100;
      const newLifetimeHours = addHhmmHours(prevLifetimeHours, upd.add_hours || 0);

      const now = new Date();

      const updatePayload: Record<string, any> = {
        current_usage_hours: newLifetimeHours,
        component_metadata: JSON.stringify({
          ...meta,
          last_mission_id: missionId,
          last_maintenance_update: now.toISOString(),
        }),
      };

      if (upd.add_hours > 0) updatePayload.current_maintenance_hours = newHours;
      if (upd.add_flights > 0) updatePayload.current_maintenance_flights = newFlights;

      const updated = await prisma.tool_component.updateMany({
        where: { component_id: upd.component_id, fk_tool_id: toolId },
        data: updatePayload,
      });

      if (updated.count === 0) {
        console.error(`[maintenance-cycle] update failed for component ${upd.component_id}`);
        return null;
      }

      const finalHours = upd.add_hours > 0 ? newHours : prevHours;
      const finalFlights = upd.add_flights > 0 ? newFlights : prevFlights;

      const { status, trigger } = computeComponentStatus(
        finalHours, finalFlights, currentDays,
        { hour: limitHour, flight: limitFlight, day: limitDay }
      );

      return {
        component_id: comp.component_id,
        component_type: comp.component_type ?? null,
        component_code: comp.component_code || comp.component_name,
        serial_number: comp.serial_number ?? null,
        current_hours: finalHours,
        current_flights: finalFlights,
        current_days: currentDays,
        limit_hour: limitHour,
        limit_flight: limitFlight,
        limit_day: limitDay,
        maintenance_cycle_type: cycleType,
        last_maintenance_date: comp.last_maintenance_date?.toISOString() ?? null,
        status,
        trigger,
        battery_cycle_ratio: batteryCycleRatio,
      };
    })
  );

  return {
    code: 1,
    message: 'Maintenance tracking updated successfully',
    components: results.filter((r): r is ComponentMaintenanceInfo => r !== null),
  };
}


export async function getToolMaintenanceStatus(toolId: number): Promise<MaintenanceStatus> {
  const openTicket = await prisma.maintenance_ticket.findFirst({
    where: { fk_tool_id: toolId, NOT: { ticket_status: 'CLOSED' } },
    select: { ticket_id: true },
  });

  if (openTicket) return 'IN_MAINTENANCE';

  await refreshMaintenanceDaysForTool(toolId);

  const components = await prisma.tool_component.findMany({
    where: { fk_tool_id: toolId, component_active: 'Y' },
    select: {
      maintenance_cycle: true,
      maintenance_cycle_hour: true,
      maintenance_cycle_day: true,
      maintenance_cycle_flight: true,
      current_maintenance_hours: true,
      current_maintenance_days: true,
      current_maintenance_flights: true,
    },
  });

  if (!components || components.length === 0) return 'OK';

  let worst: MaintenanceStatus = 'OK';

  for (const comp of components) {
    const cycleType = comp.maintenance_cycle || 'NONE';
    if (cycleType === 'NONE') continue;

    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);
    const limitDay = Number(comp.maintenance_cycle_day ?? 0);

    const currentHours = Number(comp.current_maintenance_hours ?? 0);
    const currentFlights = Number(comp.current_maintenance_flights ?? 0);
    const currentDays = Number(comp.current_maintenance_days ?? 0);

    const { status } = computeComponentStatus(
      currentHours, currentFlights, currentDays,
      { hour: limitHour, flight: limitFlight, day: limitDay }
    );

    if (status === 'DUE') { worst = 'DUE'; break; }
    if (status === 'ALERT') worst = 'ALERT';
  }

  return worst;
}
