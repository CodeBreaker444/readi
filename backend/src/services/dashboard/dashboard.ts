import { supabase } from "../../database/database";
import { getChartReadiTotalMission, getChartReadiTotalMissionResult } from "./chart-queries";
import { getReadiLastNextMissionList, getReadiTotalMission } from "./mission-queries";
import { getPilotTotal } from "./pilot-queries";


export interface DashboardRequestParams {
  owner_id: number;
  user_id: number;
  user_timezone: string;
  user_profile_code: string;
}

export interface MissionTotal {
  status: string;
  year: number;
  fk_client_id: number;
  client_name: string;
  total_mission: number;
  total_time: number;
  total_hours: number;
  total_meter: number;
  total_planned: number;
  total_drones_used: number;
  total_clients_served: number;
}

export interface MissionListItem {
  status: string;
  year: number;
  fk_client_id: number;
  fk_user_id: number;
  mission_id: number;
  date: string;
  pilot_name: string;
  drone_code: string;
  mission_type_desc: string;
  mission_result_desc: string;
  mission_duration_min: number;
}

export interface ChartData {
  labels: string[];
  series: Array<{
    name: string;
    data: number[];
  }>;
}

export interface MissionResultChart {
  labels: string[];
  series: number[];
}

export interface PilotTotal {
  total_missions: number;
  total_hours: number;
  total_distance: number;
}

/**
 * Map database status values to normalized format
 */
const normalizeStatus = (status: string): 'GREEN' | 'YELLOW' | 'RED' => {
  const statusUpper = String(status).toUpperCase().trim();
  
  if (statusUpper.includes('ABOVE') || 
      statusUpper.includes('EXCELLENT') || 
      statusUpper.includes('SUCCESS') ||
      statusUpper.includes('TARGET') && statusUpper.includes('ABOVE')) {
    return 'GREEN';
  } 
  
  if (statusUpper.includes('ON TARGET') || 
      statusUpper.includes('NORMAL') ||
      statusUpper === 'YELLOW') {
    return 'YELLOW';
  }
  
  if (statusUpper.includes('BELOW') || 
      statusUpper.includes('POOR') || 
      statusUpper.includes('ERROR') ||
      statusUpper.includes('FAIL') ||
      statusUpper === 'RED') {
    return 'RED';
  }
  
  if (statusUpper === 'GREEN') return 'GREEN';
  
  return 'YELLOW';
}
/**
 * Get complete dashboard data
 */
export async function getDashboardData(params: DashboardRequestParams) {
  const { owner_id, user_id, user_timezone, user_profile_code } = params;
  const currentYear = new Date().getFullYear();

  const isPilot = user_profile_code === 'PIC';
  const pilotUserId = isPilot ? user_id : 0;

  try {
    const [
      pilotTotal,
      readiMissionTotal,
      readiMissionSchedulerExecuted,
      readiMissionSchedulerPlanned,
      readiMissionChart,
      readiMissionResultChart,
    ] = await Promise.all([
      isPilot ? getPilotTotal(user_id) : Promise.resolve(null),

      getReadiTotalMission(0, pilotUserId, currentYear),

      getReadiLastNextMissionList(0, pilotUserId, 0, 10, user_timezone),

      getReadiLastNextMissionList(0, pilotUserId, 1, 10, user_timezone),

      getChartReadiTotalMission(0, pilotUserId, currentYear),

      getChartReadiTotalMissionResult(0, pilotUserId, currentYear),
    ]);

    return {
      pilot_total: pilotTotal,
      readi_mission_total: readiMissionTotal,
      readi_mission_chart: readiMissionChart,
      readi_mission_result_chart: readiMissionResultChart,
      readi_mission_scheduler_executed: readiMissionSchedulerExecuted,
      readi_mission_scheduler_planned: readiMissionSchedulerPlanned,
    };
  } catch (error) {
    console.error('Error in getDashboardData:', error);
    throw error;
  }
}

interface SPIKPIDataInput {
  owner_id: number,
  user_id: number,
  user_timezone?: string,
  user_profile_code?: string,
}

export async function getSPIKPIData(input: SPIKPIDataInput) {
  try {
    
    const { data: latestPeriodData, error: periodError } = await supabase
      .from('spi_kpi')
      .select('measurement_date')
      .eq('fk_owner_id', input.owner_id)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .maybeSingle();


    if (periodError) {
      return {
        code: 0,
        status: 'ERROR',
        message: `Database error: ${periodError.message}`,
        period: null,
        safety_index: 0,
        indexes: {},
        data: {},
      };
    }

    if (!latestPeriodData) {
      return {
        code: 0,
        status: 'ERROR',
        message: 'No data available',
        period: null,
        safety_index: 0,
        indexes: {},
        data: {},
      };
    }

    const latestPeriod = latestPeriodData.measurement_date;

    const { data: kpiRecords, error: kpiError } = await supabase
      .from('spi_kpi')
      .select(`
        kpi_id,
        fk_definition_id,
        actual_value,
        target_value,
        status,
        created_at
      `)
      .eq('fk_owner_id', input.owner_id)
      .eq('measurement_date', latestPeriod);

    if (kpiError) {
      throw new Error(kpiError.message);
    }

    if (!kpiRecords || kpiRecords.length === 0) {
      return {
        code: 0,
        status: 'ERROR',
        message: 'No indicators found for this period',
        period: latestPeriod,
        safety_index: 0,
        indexes: {},
        data: {},
      };
    }

    const definitionIds = [...new Set(kpiRecords.map(k => k.fk_definition_id))];

    const { data: definitions, error: defError } = await supabase
      .from('spi_kpi_definition')
      .select('definition_id, kpi_code, kpi_name, kpi_type, kpi_category, measurement_unit')
      .in('definition_id', definitionIds);

    if (defError) {
      throw new Error(defError.message);
    }

    const defMap = new Map(definitions?.map(d => [d.definition_id, d]) || []);

    const latestRecords = new Map();
    kpiRecords.forEach(record => {
      const existing = latestRecords.get(record.fk_definition_id);
      if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
        latestRecords.set(record.fk_definition_id, record);
      }
    });

    const indicators = Array.from(latestRecords.values()).map(record => {
      const def = defMap.get(record.fk_definition_id);
      return {
        indicator_code: def?.kpi_code || '',
        indicator_type: def?.kpi_type || '',
        indicator_area: def?.kpi_category || 'OTHER',
        indicator_name: def?.kpi_name || '',
        value: parseFloat(record.actual_value || 0),
        target: parseFloat(record.target_value || 0),
        unit: def?.measurement_unit || '',
        status: normalizeStatus(record.status),
        raw_status: record.status,
      };
    });

    const areaPriority: Record<string, number> = {
      'OPERATIONS': 1,
      'MAINTENANCE': 2,
      'TRAINING': 3,
      'SMS': 4,
      'COMPLIANCE': 5,
      'ICT': 6,
    };

    indicators.sort((a, b) => {
      const priorityA = areaPriority[a.indicator_area] || 7;
      const priorityB = areaPriority[b.indicator_area] || 7;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return b.indicator_type.localeCompare(a.indicator_type);
    });

    const dataByArea: Record<string, any[]> = {};
    const indexes: Record<string, number> = {};

    indicators.forEach(ind => {
      const area = ind.indicator_area;
      if (!dataByArea[area]) {
        dataByArea[area] = [];
      }
      dataByArea[area].push(ind);
    });

    Object.entries(dataByArea).forEach(([area, areaIndicators]) => {
      const score = areaIndicators.reduce((acc, ind) => {
        return acc + (ind.status === 'GREEN' ? 1 : ind.status === 'YELLOW' ? 0.5 : 0);
      }, 0);
      indexes[area] = Math.round((score / areaIndicators.length) * 1000) / 10;
    });

    const totalScore = indicators.reduce((acc, ind) => {
      return acc + (ind.status === 'GREEN' ? 1 : ind.status === 'YELLOW' ? 0.5 : 0);
    }, 0);
    const safety_index = Math.round((totalScore / indicators.length) * 1000) / 10;

    return {
      code: 1,
      status: 'SUCCESS',
      period: latestPeriod,
      safety_index,
      indexes,
      data: dataByArea,
    };
  } catch (error: any) {
    console.error('Error in getSPIKPIData:', error);
    return {
      code: 0,
      status: 'ERROR',
      message: error.message,
      period: null,
      safety_index: 0,
      indexes: {},
      data: {},
    };
  }
}
interface SPIKPITrendInput {
  owner_id: number,
  user_id: number,
  user_timezone?: string,
  user_profile_code?: string,
  name: string,
}

export async function getSPIKPITrend(input: SPIKPITrendInput) {
  try {
    const { data: definition, error: defError } = await supabase
      .from('spi_kpi_definition')
      .select('definition_id')
      .eq('kpi_name', input.name)
      .limit(1)
      .single();

    if (defError || !definition) {
      throw new Error('Indicator not found');
    }

    const { data: kpiData, error: kpiError } = await supabase
      .from('spi_kpi')
      .select('measurement_date, actual_value, target_value')
      .eq('fk_definition_id', definition.definition_id)
      .eq('fk_owner_id', input.owner_id)
      .order('measurement_date', { ascending: true })
      .limit(12);

    if (kpiError) {
      throw new Error(kpiError.message);
    }

    const periodMap = new Map<string, { sum: number; count: number; targets: number[] }>();

    (kpiData || []).forEach(record => {
      const date = new Date(record.measurement_date);
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!periodMap.has(label)) {
        periodMap.set(label, { sum: 0, count: 0, targets: [] });
      }

      const period = periodMap.get(label)!;
      period.sum += parseFloat(record.actual_value || 0);
      period.count += 1;
      if (record.target_value) {
        period.targets.push(parseFloat(record.target_value));
      }
    });

    const labels: string[] = [];
    const values: number[] = [];
    let target = 100;

    Array.from(periodMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([label, data]) => {
        labels.push(label);
        values.push(Math.round((data.sum / data.count) * 100) / 100);

        if (data.targets.length > 0) {
          target = data.targets[data.targets.length - 1];
        }
      });

    return {
      code: 1,
      status: 'SUCCESS',
      labels,
      values,
      target,
    };
  } catch (error: any) {
    console.error('Error in getSPIKPITrend:', error);
    return {
      code: 0,
      status: 'ERROR',
      message: error.message,
      labels: [],
      values: [],
      target: 100,
    };
  }
}
interface SHITrendInput {
  owner_id: number,
  user_id: number,
  user_timezone?: string,
  user_profile_code?: string
}
export async function getSHITrend(input: SHITrendInput) {
  try {
    const { data: kpiData, error: kpiError } = await supabase
      .from('spi_kpi')
      .select('measurement_date, status')
      .eq('fk_owner_id', input.owner_id)
      .order('measurement_date', { ascending: true });

    if (kpiError) {
      throw new Error(kpiError.message);
    }

    if (!kpiData || kpiData.length === 0) {
      return {
        code: 0,
        status: 'ERROR',
        message: 'No data available',
        labels: [],
        values: [],
      };
    }

    const periodMap = new Map<string, { green: number; yellow: number; total: number }>();

    kpiData.forEach(record => {
      const date = new Date(record.measurement_date);
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!periodMap.has(label)) {
        periodMap.set(label, { green: 0, yellow: 0, total: 0 });
      }

      const period = periodMap.get(label)!;
      period.total += 1;

      // Normalize status before checking
      const normalizedStatus = normalizeStatus(record.status);

      if (normalizedStatus === 'GREEN') {
        period.green += 1;
      } else if (normalizedStatus === 'YELLOW') {
        period.yellow += 1;
      }
    });

    const labels: string[] = [];
    const values: number[] = [];

    const sortedPeriods = Array.from(periodMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12);

    sortedPeriods.forEach(([label, data]) => {
      labels.push(label);
      const score = (data.green + (data.yellow * 0.5)) / data.total;
      const shi = Math.round(score * 1000) / 10;
      values.push(shi);
    });

    return {
      code: 1,
      status: 'SUCCESS',
      labels,
      values,
    };
  } catch (error: any) {
    console.error('Error in getSHITrend:', error);
    return {
      code: 0,
      status: 'ERROR',
      message: error.message,
      labels: [],
      values: [],
    };
  }
}