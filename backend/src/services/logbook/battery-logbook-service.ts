import { supabase } from '@/backend/database/database';
import {
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

  const mapped: BatteryLogbookItem[] = (data || [])
    .filter((item) => item.component_metadata?.system_detached !== true)
    .map((item) => {
      const meta = item.component_metadata || {};
      const tool = item.fk_tool_id ? toolMap[item.fk_tool_id] : null;
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
