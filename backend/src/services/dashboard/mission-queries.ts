import { supabase } from "../../database/database";
import { dateConversionUtcToLocal, getCurrentYear } from "../../utils/date-utils";
import { MissionListItem, MissionTotal } from "./dashboard";

/**
 * Get total mission statistics.
 * Filters by scheduled_start (matches PHP view's date_start) so that
 * planned missions with null actual_start are included.
 */
export async function getReadiTotalMission(
  ownerId: number,
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
        scheduled_start,
        actual_start,
        fk_tool_id,
        fk_planning_id
      `)
      .eq('fk_owner_id', ownerId)
      .gte('scheduled_start', `${year}-01-01`)
      .lte('scheduled_start', `${year}-12-31`);

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    const { data: missions, error } = await query;

    if (error) {
      console.error('Error getting mission total:', error);
      throw error;
    }

    if (!missions || missions.length === 0) {
      return {
        status: 'success',
        year,
        fk_client_id: fkClientId,
        client_name: 'All Clients',
        total_mission: 0,
        total_time: 0,
        total_hours: 0,
        total_meter: 0,
        total_planned: 0,
        total_drones_used: 0,
        total_clients_served: 0,
      };
    }

    let clientName = 'All Clients';
    const planningIds = missions.map(m => m.fk_planning_id).filter(Boolean);

    if (fkClientId !== 0 && planningIds.length > 0) {
      const { data: planningData } = await supabase
        .from('planning')
        .select(`
          planning_id,
          fk_client_id,
          client (
            client_id,
            client_name
          )
        `)
        .eq('fk_owner_id', ownerId)
        .in('planning_id', planningIds)
        .eq('fk_client_id', fkClientId)
        .limit(1)
        .single();

      if (planningData) {
        const client = Array.isArray(planningData.client) ? planningData.client[0] : planningData.client;
        clientName = client?.client_name || 'Unknown Client';
      }
    }

    const total_mission = missions.length;
    const total_time = missions.reduce((sum, m) => sum + (m.flight_duration || 0), 0);
    const total_hours = Math.floor(total_time / 60);
    const total_meter = missions.reduce((sum, m) => sum + (m.distance_flown || 0), 0);

    // PHP: SUM(is_scheduled_future) = count of missions where scheduled_start > NOW()
    const now = new Date();
    const total_planned = missions.filter(m => m.scheduled_start && new Date(m.scheduled_start) > now).length;

    const uniqueDrones = new Set(missions.map(m => m.fk_tool_id).filter(Boolean));
    const total_drones_used = uniqueDrones.size;

    let total_clients_served = 0;
    if (planningIds.length > 0) {
      const { data: planningData } = await supabase
        .from('planning')
        .select('fk_client_id')
        .eq('fk_owner_id', ownerId)
        .in('planning_id', planningIds);

      const uniqueClients = new Set(
        (planningData || []).map(p => p.fk_client_id).filter(Boolean)
      );
      total_clients_served = uniqueClients.size;
    }

    return {
      status: 'success',
      year,
      fk_client_id: fkClientId,
      client_name: clientName,
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
 * Get last (executed) or next (planned) mission list.
 * Uses scheduled_start for past/future determination — matching PHP's
 * view_missioni_aggregate.is_scheduled_future = IF(date_start > NOW(), 1, 0)
 * where date_start = scheduled_start.
 * Displayed date uses actual_start if available, falls back to scheduled_start.
 */
export async function getReadiLastNextMissionList(
  ownerId: number,
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
        scheduled_start,
        actual_start,
        flight_duration,
        fk_pilot_user_id,
        fk_planning_id,
        users (
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
        )
      `)
      .eq('fk_owner_id', ownerId);

    if (fkUserId !== 0) {
      query = query.eq('fk_pilot_user_id', fkUserId);
    }

    if (isScheduledFuture === 1) {
      // Next/planned missions: scheduled_start in the future (PHP: is_scheduled_future = 1)
      query = query
        .gt('scheduled_start', now)
        .order('scheduled_start', { ascending: true });
    } else {
      // Past/executed missions: scheduled_start in the past (PHP: is_scheduled_future = 0)
      query = query
        .lte('scheduled_start', now)
        .order('scheduled_start', { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error getting mission list:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    const planningIds = data.map(m => m.fk_planning_id).filter(Boolean);
    const planningMap = new Map();

    if (planningIds.length > 0) {
      let planningQuery = supabase
        .from('planning')
        .select('planning_id, fk_client_id')
        .eq('fk_owner_id', ownerId)
        .in('planning_id', planningIds);

      if (fkClientId !== 0) {
        planningQuery = planningQuery.eq('fk_client_id', fkClientId);
      }

      const { data: planningData } = await planningQuery;

      (planningData || []).forEach(p => {
        planningMap.set(p.planning_id, p);
      });
    }

    return data
      .filter(item => {
        if (fkClientId === 0) return true;
        const planning = planningMap.get(item.fk_planning_id);
        return planning?.fk_client_id === fkClientId;
      })
      .map((item: any) => {
        const planning = planningMap.get(item.fk_planning_id);
        const users = Array.isArray(item.users) ? item.users[0] : item.users;
        const tool = Array.isArray(item.tool) ? item.tool[0] : item.tool;
        const missionType = Array.isArray(item.pilot_mission_type)
          ? item.pilot_mission_type[0]
          : item.pilot_mission_type;
        const missionResult = Array.isArray(item.pilot_mission_result)
          ? item.pilot_mission_result[0]
          : item.pilot_mission_result;

        // Use actual_start if the mission has started, otherwise show scheduled_start
        const displayDate = item.actual_start || item.scheduled_start;

        return {
          status: 'success',
          year: currentYear,
          fk_client_id: planning?.fk_client_id || 0,
          fk_user_id: item.fk_pilot_user_id || 0,
          mission_id: item.pilot_mission_id,
          date: dateConversionUtcToLocal(displayDate, userTimezone),
          pilot_name: users ? `${users.first_name} ${users.last_name}` : '',
          drone_code: tool?.tool_code || '',
          mission_type_desc: missionType?.type_name || '',
          mission_result_desc: missionResult?.result_type || '',
          mission_duration_min: item.flight_duration || 0,
        };
      });
  } catch (error) {
    console.error('Error in getReadiLastNextMissionList:', error);
    throw error;
  }
}
