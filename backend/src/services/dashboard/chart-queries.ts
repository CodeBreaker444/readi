import { supabase } from "../../database/database";
import { ChartData, MissionResultChart } from "./dashboard";

/**
 * Get mission chart data (missions per month per drone)
 */
export async function getChartReadiTotalMission(
  ownerId: number,
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
        fk_planning_id,
        tool (
          tool_id,
          tool_code
        )
      `)
      .eq('fk_owner_id', ownerId)
      .gte('actual_start', `${year}-01-01`)
      .lte('actual_start', `${year}-12-31`)
      .not('tool.tool_code', 'is', null);

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission chart:', error);
      throw error;
    }

    let filteredData = data || [];

    if (fkClientId !== 0 && filteredData.length > 0) {
      const planningIds = filteredData.map(m => m.fk_planning_id).filter(Boolean);

      if (planningIds.length > 0) {
        const { data: planningData } = await supabase
          .from('planning')
          .select('planning_id')
          .eq('fk_owner_id', ownerId)
          .in('planning_id', planningIds)
          .eq('fk_client_id', fkClientId);

        const validPlanningIds = new Set((planningData || []).map(p => p.planning_id));
        filteredData = filteredData.filter(m => validPlanningIds.has(m.fk_planning_id));
      }
    }

    const labels = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const droneMap = new Map<string, number[]>();

    filteredData.forEach((mission: any) => {
      const tool = Array.isArray(mission.tool) ? mission.tool[0] : mission.tool;
      const droneName = tool?.tool_code;

      if (!droneName) return;

      const date = new Date(mission.actual_start);
      const month = date.getMonth();

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
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [],
    };
  }
}

/**
 * Get mission result chart data
 */
export async function getChartReadiTotalMissionResult(
  ownerId: number,
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
        fk_planning_id,
        pilot_mission_result (
          result_id,
          result_type
        )
      `)
      .eq('fk_owner_id', ownerId)
      .gte('actual_start', `${year}-01-01`)
      .lte('actual_start', `${year}-12-31`);

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission result chart:', error);
      throw error;
    }

    let filteredData = data || [];

    if (fkClientId !== 0 && filteredData.length > 0) {
      const planningIds = filteredData.map(m => m.fk_planning_id).filter(Boolean);

      if (planningIds.length > 0) {
        const { data: planningData } = await supabase
          .from('planning')
          .select('planning_id')
          .eq('fk_owner_id', ownerId)
          .in('planning_id', planningIds)
          .eq('fk_client_id', fkClientId);

        const validPlanningIds = new Set((planningData || []).map(p => p.planning_id));
        filteredData = filteredData.filter(m => validPlanningIds.has(m.fk_planning_id));
      }
    }

    const resultMap = new Map<string, number>();

    filteredData.forEach((mission: any) => {
      const result = Array.isArray(mission.pilot_mission_result)
        ? mission.pilot_mission_result[0]
        : mission.pilot_mission_result;
      const resultType = result?.result_type || 'Unknown';

      resultMap.set(resultType, (resultMap.get(resultType) || 0) + 1);
    });

    const labels: string[] = [];
    const series: number[] = [];

    const sortedEntries = Array.from(resultMap.entries()).sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([label, count]) => {
      labels.push(label);
      series.push(count);
    });

    return { labels, series };
  } catch (error) {
    console.error('Error in getChartReadiTotalMissionResult:', error);
    return { labels: [], series: [] };
  }
}