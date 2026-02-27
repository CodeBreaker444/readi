import { supabase } from "../../database/database";
import { dateConversionUtcToLocal, getCurrentYear } from "../../utils/date-utils";
import { MissionListItem, MissionTotal } from "./dashboard";

/**
 * Get total mission statistics
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
        actual_start,
        fk_tool_id,
        fk_mission_status_id,
        fk_planning_id,
        pilot_mission_status (
          status_id,
          status_code
        )
      `)
      .eq('fk_owner_id', ownerId)
      .gte('actual_start', `${year}-01-01`)
      .lte('actual_start', `${year}-12-31`);

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

    const total_planned = missions.filter(m => {
      const status = Array.isArray(m.pilot_mission_status)
        ? m.pilot_mission_status[0]
        : m.pilot_mission_status;
      const statusCode = status?.status_code;
      return statusCode === 'PLANNED' || statusCode === 'SCHEDULED';
    }).length;

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
 * Get last or next mission list
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

        return {
          status: 'success',
          year: currentYear,
          fk_client_id: planning?.fk_client_id || 0,
          fk_user_id: item.fk_pilot_user_id || 0,
          mission_id: item.pilot_mission_id,
          date: dateConversionUtcToLocal(item.actual_start, userTimezone),
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