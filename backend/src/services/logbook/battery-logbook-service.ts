import { prisma } from '@/lib/prisma';
import {
  BatteryCycleItem,
  BatteryFilterParams,
  BatteryLogbookItem,
  BatterySystemOption,
} from '@/config/types/logbook';

export async function getBatteryLogbookList(
  params: BatteryFilterParams
): Promise<{ code: number; message: string; dataRows: number; data: BatteryLogbookItem[] }> {
  const ownerTools = await prisma.tool.findMany({
    where: { fk_owner_id: params.owner_id, tool_active: 'Y' },
    select: { tool_id: true, tool_code: true, tool_name: true },
  });

  const toolIds = ownerTools.map((t) => t.tool_id);
  const toolMap: Record<number, { code: string; desc: string }> = {};
  for (const t of ownerTools) {
    toolMap[t.tool_id] = { code: t.tool_code ?? '', desc: t.tool_name ?? '' };
  }

  if (toolIds.length === 0) {
    return { code: 200, message: 'success', dataRows: 0, data: [] };
  }

  const componentWhere: any = {
    fk_tool_id: { in: toolIds },
    component_type: 'BATTERY',
    component_active: 'Y',
    ...(params.tool_id && params.tool_id !== 0 && { fk_tool_id: params.tool_id }),
    ...(params.component_status && params.component_status !== 'ALL' && {
      component_metadata: { path: ['component_status'], equals: params.component_status },
    }),
    ...(params.date_start && { installation_date: { gte: new Date(params.date_start) } }),
    ...(params.date_end && { installation_date: { lte: new Date(params.date_end) } }),
  };

  const components = await prisma.tool_component.findMany({
    where: componentWhere,
    select: {
      component_id: true,
      fk_tool_id: true,
      component_code: true,
      component_name: true,
      serial_number: true,
      installation_date: true,
      component_metadata: true,
      maintenance_cycle: true,
      maintenance_cycle_hour: true,
      maintenance_cycle_day: true,
      maintenance_cycle_flight: true,
      current_usage_hours: true,
      current_maintenance_hours: true,
      current_maintenance_days: true,
      current_maintenance_flights: true,
      last_maintenance_date: true,
    },
    orderBy: { component_id: 'desc' },
  });

  const batteries = components.filter(
    (item) => (item.component_metadata as any)?.system_detached !== true
  );

  const batteryToolIds = [...new Set(batteries.map((b) => b.fk_tool_id).filter(Boolean))] as number[];
  const missionsGrouped: Record<number, any[]> = {};

  if (batteryToolIds.length > 0) {
    const missions = await prisma.pilot_mission.findMany({
      where: {
        fk_tool_id: { in: batteryToolIds },
        fk_owner_id: params.owner_id,
        actual_start: { not: null },
      },
      select: {
        pilot_mission_id: true,
        mission_code: true,
        actual_start: true,
        actual_end: true,
        flight_duration: true,
        fk_tool_id: true,
        users: { select: { first_name: true, last_name: true } },
      },
      orderBy: { actual_start: 'desc' },
    });

    for (const m of missions) {
      const tid = m.fk_tool_id!;
      if (!missionsGrouped[tid]) missionsGrouped[tid] = [];
      missionsGrouped[tid].push(m);
    }
  }

  const mapped: BatteryLogbookItem[] = batteries.map((item) => {
    const meta = (item.component_metadata as any) ?? {};
    const tool = item.fk_tool_id ? toolMap[item.fk_tool_id] : null;
    const cycleRatio: number = meta.battery_cycle_ratio ?? 1;
    const toolMissions = item.fk_tool_id ? (missionsGrouped[item.fk_tool_id] ?? []) : [];
    const installDate: Date | null = item.installation_date ?? null;

    const cycles: BatteryCycleItem[] = toolMissions
      .filter((m) => !installDate || (m.actual_start && m.actual_start >= installDate))
      .map((m) => {
        const durationSec = Number(m.flight_duration) || 0;
        return {
          mission_id: m.pilot_mission_id,
          mission_code: m.mission_code ?? '',
          actual_start: m.actual_start?.toISOString() ?? null,
          actual_end: m.actual_end?.toISOString() ?? null,
          flight_duration_min: Math.round((durationSec / 60) * 10) / 10,
          cycles_consumed: Math.round(cycleRatio * 100) / 100,
          pilot_name: m.users
            ? `${m.users.first_name} ${m.users.last_name}`.trim()
            : '—',
        };
      });

    return {
      component_id: item.component_id,
      component_code: item.component_code ?? '',
      component_sn: item.serial_number ?? '',
      component_status: meta.component_status ?? 'OPERATIONAL',
      component_vendor: meta.component_vendor ?? '',
      component_purchase_date: meta.component_purchase_date ?? null,
      component_activation_date: item.installation_date?.toISOString() ?? null,
      component_guarantee_day: meta.component_guarantee_day ?? 0,
      battery_cycle_ratio: meta.battery_cycle_ratio ?? null,
      current_usage_hours: Number(item.current_usage_hours) || 0,
      current_maintenance_hours: Number(item.current_maintenance_hours) || 0,
      current_maintenance_days: Number(item.current_maintenance_days) || 0,
      current_maintenance_flights: Number(item.current_maintenance_flights) || 0,
      last_maintenance_date: item.last_maintenance_date?.toISOString() ?? null,
      maintenance_cycle: item.maintenance_cycle ?? '',
      fk_tool_id: item.fk_tool_id ?? null,
      tool_code: tool?.code ?? '',
      tool_desc: tool?.desc ?? '',
      cycles,
    };
  });

  return { code: 200, message: 'success', dataRows: mapped.length, data: mapped };
}


export async function getBatteryCycles(
  component_id: number,
  owner_id: number
): Promise<{ code: number; message: string; dataRows: number; data: BatteryCycleItem[] }> {
  const battery = await prisma.tool_component.findFirst({
    where: { component_id, component_type: 'BATTERY', component_active: 'Y' },
    select: { component_id: true, fk_tool_id: true, installation_date: true, component_metadata: true },
  });

  if (!battery) {
    return { code: 404, message: 'Battery not found', dataRows: 0, data: [] };
  }

  const tool = await prisma.tool.findFirst({
    where: { tool_id: battery.fk_tool_id!, fk_owner_id: owner_id },
    select: { tool_id: true },
  });

  if (!tool) {
    return { code: 403, message: 'Forbidden', dataRows: 0, data: [] };
  }

  const cycleRatio: number = (battery.component_metadata as any)?.battery_cycle_ratio ?? 1;

  const missions = await prisma.pilot_mission.findMany({
    where: {
      fk_tool_id: battery.fk_tool_id!,
      fk_owner_id: owner_id,
      actual_start: {
        not: null,
        ...(battery.installation_date && { gte: battery.installation_date }),
      },
    },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      actual_start: true,
      actual_end: true,
      flight_duration: true,
      users: { select: { first_name: true, last_name: true } },
    },
    orderBy: { actual_start: 'desc' },
  });

  const mapped: BatteryCycleItem[] = missions.map((m) => {
    const durationSec = Number(m.flight_duration) || 0;
    return {
      mission_id: m.pilot_mission_id,
      mission_code: m.mission_code ?? '',
      actual_start: m.actual_start?.toISOString() ?? null,
      actual_end: m.actual_end?.toISOString() ?? null,
      flight_duration_min: Math.round((durationSec / 60) * 10) / 10,
      cycles_consumed: Math.round(cycleRatio * 100) / 100,
      pilot_name: m.users
        ? `${m.users.first_name} ${m.users.last_name}`.trim()
        : '—',
    };
  });

  return { code: 200, message: 'success', dataRows: mapped.length, data: mapped };
}


export async function getBatteryLogbookFilters(
  owner_id: number
): Promise<{
  code: number;
  systems: { data: BatterySystemOption[] };
  statuses: { data: string[] };
}> {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: owner_id, tool_active: 'Y' },
    select: { tool_id: true, tool_code: true, tool_name: true },
    orderBy: { tool_code: 'asc' },
  });

  const systemOptions: BatterySystemOption[] = tools.map((t) => ({
    tool_id: t.tool_id,
    tool_code: t.tool_code ?? '',
    tool_desc: t.tool_name ?? '',
  }));

  return {
    code: 200,
    systems: { data: systemOptions },
    statuses: { data: ['OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED'] },
  };
}
