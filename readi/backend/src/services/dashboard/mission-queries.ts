import { supabase } from "../../database/database";
import { dateConversionUtcToLocal, getCurrentYear } from "../../utils/date-utils";
import { MissionListItem, MissionTotal } from "./dashboard";

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

    const missions = data || []
    
    const total_mission = missions.length;
    
    const total_time = missions.reduce((sum, m) => sum + (m.flight_duration || 0), 0);
    
    const total_hours = Math.floor(total_time / 60);
    
    const total_meter = missions.reduce((sum, m) => sum + (m.distance_flown || 0), 0);
    
    // Fixed: Access pilot_mission_status as a single object, not array
const total_planned = missions.filter(m => {
  const statusCode = m.pilot_mission_status?.[0]?.status_code;
  return statusCode === 'PLANNED' || statusCode === 'SCHEDULED';
}).length;

const uniqueDrones = new Set(missions.map(m => m.fk_tool_id).filter(Boolean));
const total_drones_used = uniqueDrones.size;

const uniqueClients = new Set(
  missions
    .flatMap(m => (m.planning ?? []).map(p => p.fk_client_id))
    .filter((id): id is number => !!id)
);

const total_clients_served = uniqueClients.size;

const client_name =
  fkClientId === 0
    ? 'All Clients'
    : missions[0]?.planning?.[0]?.client?.[0]?.client_name || 'Unknown Client';

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
