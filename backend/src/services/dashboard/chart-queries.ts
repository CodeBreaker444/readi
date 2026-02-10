import { supabase } from "../../database/database";
import { ChartData, MissionResultChart } from "./dashboard";

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
