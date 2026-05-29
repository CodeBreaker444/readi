import { supabase } from '@/backend/database/database';
import {
  BatteryCycleItem,
  BatteryFilterParams,
  BatteryLogbookItem,
  BatterySystemOption,
} from '@/config/types/logbook';

export async function getBatteryLogbookList(
  params: BatteryFilterParams
): Promise<{ code: number; message: string; dataRows: number; data: BatteryLogbookItem[] }> {
  const { data: ownerTools, error: toolError } = await supabase
    .from('tool')
    .select('tool_id, tool_code, tool_name')
    .eq('fk_owner_id', params.owner_id)
    .eq('tool_active', 'Y');

  if (toolError) throw toolError;

  const toolIds = (ownerTools || []).map((t) => t.tool_id);
  const toolMap: Record<number, { code: string; desc: string }> = {};
  for (const t of ownerTools || []) {
    toolMap[t.tool_id] = { code: t.tool_code, desc: t.tool_name ?? '' };
  }

  if (toolIds.length === 0) {
    return { code: 200, message: 'success', dataRows: 0, data: [] };
  }

  let query = supabase
    .from('tool_component')
    .select(`
      component_id,
      fk_tool_id,
      component_code,
      component_name,
      serial_number,
      installation_date,
      component_active,
      component_metadata,
      maintenance_cycle,
      maintenance_cycle_hour,
      maintenance_cycle_day,
      maintenance_cycle_flight,
      current_usage_hours,
      current_maintenance_hours,
      current_maintenance_days,
      current_maintenance_flights,
      last_maintenance_date
    `)
    .in('fk_tool_id', toolIds)
    .eq('component_type', 'BATTERY')
    .eq('component_active', 'Y');

  if (params.tool_id && params.tool_id !== 0) {
    query = query.eq('fk_tool_id', params.tool_id);
  }
  if (params.component_status && params.component_status !== 'ALL') {
    query = query.eq('component_metadata->>component_status', params.component_status);
  }
  if (params.date_start) {
    query = query.gte('installation_date', params.date_start);
  }
  if (params.date_end) {
    query = query.lte('installation_date', params.date_end);
  }

  const { data, error } = await query.order('component_id', { ascending: false });
  if (error) throw error;

  const batteries = (data || []).filter(
    (item) => item.component_metadata?.system_detached !== true
  );

  const batteryToolIds = [...new Set(batteries.map((b) => b.fk_tool_id).filter(Boolean))];
  const missionsGrouped: Record<number, any[]> = {};

  if (batteryToolIds.length > 0) {
    const { data: missions } = await supabase
      .from('pilot_mission')
      .select(`
        pilot_mission_id,
        mission_code,
        actual_start,
        actual_end,
        flight_duration,
        fk_tool_id,
        pilot:users!fk_pilot_user_id ( first_name, last_name )
      `)
      .in('fk_tool_id', batteryToolIds)
      .eq('fk_owner_id', params.owner_id)
      .not('actual_start', 'is', null)
      .order('actual_start', { ascending: false });

    for (const m of missions || []) {
      if (!missionsGrouped[m.fk_tool_id]) missionsGrouped[m.fk_tool_id] = [];
      missionsGrouped[m.fk_tool_id].push(m);
    }
  }

  const mapped: BatteryLogbookItem[] = batteries.map((item) => {
    const meta = item.component_metadata || {};
    const tool = item.fk_tool_id ? toolMap[item.fk_tool_id] : null;
    const cycleRatio: number = meta.battery_cycle_ratio ?? 1;
    const toolMissions = item.fk_tool_id ? (missionsGrouped[item.fk_tool_id] ?? []) : [];
    const installDate: string | null = item.installation_date ?? null;

    const cycles: BatteryCycleItem[] = toolMissions
      .filter((m) => !installDate || m.actual_start >= installDate)
      .map((m) => {
        const pilotArr = m.pilot as { first_name: string; last_name: string }[] | null;
        const pilot = Array.isArray(pilotArr) ? pilotArr[0] ?? null : null;
        const durationSec = Number(m.flight_duration) || 0;
        return {
          mission_id: m.pilot_mission_id,
          mission_code: m.mission_code ?? '',
          actual_start: m.actual_start ?? null,
          actual_end: m.actual_end ?? null,
          flight_duration_min: Math.round((durationSec / 60) * 10) / 10,
          cycles_consumed: Math.round(cycleRatio * 100) / 100,
          pilot_name: pilot ? `${pilot.first_name} ${pilot.last_name}`.trim() : '—',
        };
      });

    return {
      component_id: item.component_id,
      component_code: item.component_code ?? '',
      component_sn: item.serial_number ?? '',
      component_status: meta.component_status ?? 'OPERATIONAL',
      component_vendor: meta.component_vendor ?? '',
      component_purchase_date: meta.component_purchase_date ?? null,
      component_activation_date: item.installation_date ?? null,
      component_guarantee_day: meta.component_guarantee_day ?? 0,
      battery_cycle_ratio: meta.battery_cycle_ratio ?? null,
      current_usage_hours: Number(item.current_usage_hours) || 0,
      current_maintenance_hours: Number(item.current_maintenance_hours) || 0,
      current_maintenance_days: Number(item.current_maintenance_days) || 0,
      current_maintenance_flights: Number(item.current_maintenance_flights) || 0,
      last_maintenance_date: item.last_maintenance_date ?? null,
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
  const { data: battery, error: batError } = await supabase
    .from('tool_component')
    .select('component_id, fk_tool_id, installation_date, component_metadata')
    .eq('component_id', component_id)
    .eq('component_type', 'BATTERY')
    .eq('component_active', 'Y')
    .single();

  if (batError || !battery) {
    return { code: 404, message: 'Battery not found', dataRows: 0, data: [] };
  }

  const { data: tool } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('tool_id', battery.fk_tool_id)
    .eq('fk_owner_id', owner_id)
    .single();

  if (!tool) {
    return { code: 403, message: 'Forbidden', dataRows: 0, data: [] };
  }

  const cycleRatio: number = battery.component_metadata?.battery_cycle_ratio ?? 1;

  let missionQuery = supabase
    .from('pilot_mission')
    .select(`
      pilot_mission_id,
      mission_code,
      actual_start,
      actual_end,
      flight_duration,
      pilot:users!fk_pilot_user_id ( first_name, last_name )
    `)
    .eq('fk_tool_id', battery.fk_tool_id)
    .eq('fk_owner_id', owner_id)
    .not('actual_start', 'is', null)
    .order('actual_start', { ascending: false });

  if (battery.installation_date) {
    missionQuery = missionQuery.gte('actual_start', battery.installation_date);
  }

  const { data: missions, error: missionError } = await missionQuery;
  if (missionError) throw missionError;

  const mapped: BatteryCycleItem[] = (missions || []).map((m) => {
    const pilotArr = m.pilot as { first_name: string; last_name: string }[] | null;
    const pilot = Array.isArray(pilotArr) ? pilotArr[0] ?? null : null;
    const durationSec = Number(m.flight_duration) || 0;
    return {
      mission_id: m.pilot_mission_id,
      mission_code: m.mission_code ?? '',
      actual_start: m.actual_start ?? null,
      actual_end: m.actual_end ?? null,
      flight_duration_min: Math.round((durationSec / 60) * 10) / 10,
      cycles_consumed: Math.round(cycleRatio * 100) / 100,
      pilot_name: pilot ? `${pilot.first_name} ${pilot.last_name}`.trim() : '—',
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
  const { data: tools } = await supabase
    .from('tool')
    .select('tool_id, tool_code, tool_name')
    .eq('fk_owner_id', owner_id)
    .eq('tool_active', 'Y')
    .order('tool_code');

  const systemOptions: BatterySystemOption[] = (tools || []).map((t) => ({
    tool_id: t.tool_id,
    tool_code: t.tool_code,
    tool_desc: t.tool_name ?? '',
  }));

  return {
    code: 200,
    systems: { data: systemOptions },
    statuses: { data: ['OPERATIONAL', 'MAINTENANCE', 'DECOMMISSIONED'] },
  };
}
