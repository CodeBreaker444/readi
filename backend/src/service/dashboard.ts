import { supabase } from "../database/database";
import { dateConversionUtcToLocal, getCurrentYear } from "../utils/date-utils";

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

 
export async function getPilotTotal(userId: number): Promise<PilotTotal> {
  try {
    const currentYear = getCurrentYear();

 
    const { data, error } = await supabase
      .from('pilot_mission')
      .select('pilot_mission_id, flight_duration, distance_flown, actual_start')
      .eq('fk_pilot_user_id', userId)  
      .gte('actual_start', `${currentYear}-01-01`)  
      .lte('actual_start', `${currentYear}-12-31`);  

    if (error) {
      console.error('Error getting pilot total:', error);
      return {
        total_missions: 0,
        total_hours: 0,
        total_distance: 0,
      };
    }

    const total_missions = data?.length || 0; 
    const total_time = data?.reduce((sum, m) => sum + (m.flight_duration || 0), 0) || 0;  
    const total_hours = Math.floor(total_time / 60);  
    const total_distance = data?.reduce((sum, m) => sum + (m.distance_flown || 0), 0) || 0; 

    return {
      total_missions,
      total_hours,
      total_distance,
    };
  } catch (error) {
    console.error('Error in getPilotTotal:', error);
    return {
      total_missions: 0,
      total_hours: 0,
      total_distance: 0,
    };
  }
}

/**
 * Get total mission statistics
 */
export async function getReadiTotalMission(
  fkClientId: number,
  fkUserId: number,
  year: number
): Promise<MissionTotal> {
  try {
    let query = supabase
      .from('pilot_mission')
      .select(`
        pilot_mission_id,
        flight_duration,
        distance_flown,
        actual_start,
        fk_tool_id,
        fk_mission_status_id,
        planning!inner (
          planning_id,
          fk_client_id,
          client!inner (
            client_id,
            client_name
          )
        ),
        pilot_mission_status!inner (
          status_id,
          status_code
        )
      `)
      .gte('actual_start', `${year}-01-01`) 
      .lte('actual_start', `${year}-12-31`); 

    if (fkClientId !== 0) {
      query = query.eq('planning.fk_client_id', fkClientId);
    }

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission total:', error);
      throw error;
    }

    const missions = data || [];
    
    const total_mission = missions.length;
    
    const total_time = missions.reduce((sum, m) => sum + (m.flight_duration || 0), 0);
    
    const total_hours = Math.floor(total_time / 60);
    
    const total_meter = missions.reduce((sum, m) => sum + (m.distance_flown || 0), 0);
    
    const total_planned = missions.filter(
      m => m.pilot_mission_status?.status_code === 'PLANNED' || 
           m.pilot_mission_status?.status_code === 'SCHEDULED'
    ).length;
    
    const uniqueDrones = new Set(missions.map(m => m.fk_tool_id).filter(Boolean));
    const total_drones_used = uniqueDrones.size;
    
    const uniqueClients = new Set(
      missions
        .map(m => m.planning?.fk_client_id)
        .filter(Boolean)
    );
    const total_clients_served = uniqueClients.size;

    const client_name = fkClientId === 0 
      ? 'All Clients' 
      : missions[0]?.planning?.client?.client_name || 'Unknown Client';

    return {
      status: 'success',
      year,
      fk_client_id: fkClientId,
      client_name,
      total_mission,
      total_time,
      total_hours,
      total_meter,
      total_planned,
      total_drones_used,
      total_clients_served,
    };
  } catch (error) {
    console.error('Error in getReadiTotalMission:', error);
    throw error;
  }
}

/**
 * Get last or next mission list
 */
export async function getReadiLastNextMissionList(
  fkClientId: number,
  fkUserId: number,
  isScheduledFuture: number,
  limit: number,
  userTimezone: string
): Promise<MissionListItem[]> {
  try {
    const currentYear = getCurrentYear();
    const now = new Date().toISOString();

    let query = supabase
      .from('pilot_mission')
      .select(`
        pilot_mission_id,
        actual_start,
        flight_duration,
        fk_pilot_user_id,
        users!inner (
          user_id,
          first_name,
          last_name
        ),
        tool (
          tool_id,
          tool_code
        ),
        pilot_mission_type (
          mission_type_id,
          type_name
        ),
        pilot_mission_result (
          result_id,
          result_type
        ),
        planning (
          planning_id,
          fk_client_id
        )
      `);

    if (fkClientId !== 0) {
      query = query.eq('planning.fk_client_id', fkClientId);
    }

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    if (isScheduledFuture === 1) {
      query = query.gt('actual_start', now).order('actual_start', { ascending: true });
    } else {
      query = query.lte('actual_start', now).order('actual_start', { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission list:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      status: 'success',
      year: currentYear,
      fk_client_id: item.planning?.fk_client_id || 0,
      fk_user_id: item.fk_pilot_user_id || 0,
      mission_id: item.pilot_mission_id,
      date: dateConversionUtcToLocal(item.actual_start, userTimezone),
      pilot_name: item.users 
        ? `${item.users.first_name} ${item.users.last_name}` 
        : '',
      drone_code: item.tool?.tool_code || '',
      mission_type_desc: item.pilot_mission_type?.type_name || '',
      mission_result_desc: item.pilot_mission_result?.result_type || '',
      mission_duration_min: item.flight_duration || 0,
    }));
  } catch (error) {
    console.error('Error in getReadiLastNextMissionList:', error);
    throw error;
  }
}

/**
 * Get mission chart data (missions per month per drone)
 */
export async function getChartReadiTotalMission(
  fkClientId: number,
  fkUserId: number,
  year: number
): Promise<ChartData> {
  try {
   
    let query = supabase
      .from('pilot_mission')
      .select(`
        pilot_mission_id,
        actual_start,
        fk_tool_id,
        tool!inner (
          tool_id,
          tool_code
        ),
        planning (
          planning_id,
          fk_client_id
        )
      `)
      .gte('actual_start', `${year}-01-01`) 
      .lte('actual_start', `${year}-12-31`) 
      .not('tool.tool_code', 'is', null);  
    if (fkClientId !== 0) {
      query = query.eq('planning.fk_client_id', fkClientId);
    }

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission chart:', error);
      throw error;
    }

    const labels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const droneMap = new Map<string, number[]>();

    (data || []).forEach((mission: any) => {
      const droneName = mission.tool?.tool_code;
      if (!droneName) return;

      const date = new Date(mission.actual_start);
      const month = date.getMonth(); // 0-11

      if (!droneMap.has(droneName)) {
        droneMap.set(droneName, new Array(12).fill(0));
      }

      const droneData = droneMap.get(droneName);
      if (droneData) {
        droneData[month]++;
      }
    });

    
    const series = Array.from(droneMap.entries()).map(([name, data]) => ({
      name,
      data,
    }));

    return { labels, series };
  } catch (error) {
    console.error('Error in getChartReadiTotalMission:', error);
    return {
      labels: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ],
      series: [],
    };
  }
}

/**
 * Get mission result chart data
 */
export async function getChartReadiTotalMissionResult(
  fkClientId: number,
  fkUserId: number,
  year: number
): Promise<MissionResultChart> {
  try {
   
    let query = supabase
      .from('pilot_mission')
      .select(`
        pilot_mission_id,
        actual_start,
        pilot_mission_result (
          result_id,
          result_type
        ),
        planning (
          planning_id,
          fk_client_id
        )
      `)
      .gte('actual_start', `${year}-01-01`) 
      .lte('actual_start', `${year}-12-31`);  

    if (fkClientId !== 0) {
      query = query.eq('planning.fk_client_id', fkClientId);
    }

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission result chart:', error);
      throw error;
    }

    const resultMap = new Map<string, number>();

    (data || []).forEach((mission: any) => {
      const resultType = mission.pilot_mission_result?.result_type || 'Unknown';
      
      resultMap.set(resultType, (resultMap.get(resultType) || 0) + 1);
    });

    const labels: string[] = [];
    const series: number[] = [];

    const sortedEntries = Array.from(resultMap.entries())
      .sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([label, count]) => {
      labels.push(label);  
      series.push(count);  
    });

    return { labels, series };
  } catch (error) {
    console.error('Error in getChartReadiTotalMissionResult:', error);
    return {
      labels: [],
      series: [],
    };
  }
}

/**
 * Get complete dashboard data
 */
export async function getDashboardData(params: DashboardRequestParams) {
  const { owner_id, user_id, user_timezone, user_profile_code } = params;
  const currentYear = getCurrentYear();

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