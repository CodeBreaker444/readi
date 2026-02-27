import { supabase } from "../../database/database";
import { getCurrentYear } from "../../utils/date-utils";
import { PilotTotal } from "./dashboard";

export async function getPilotTotal(userId: number, ownerId: number): Promise<PilotTotal> {
  try {
    const currentYear = getCurrentYear();

    const { data, error } = await supabase
      .from('pilot_mission')
      .select('pilot_mission_id, flight_duration, distance_flown, actual_start, fk_owner_id')
      .eq('fk_pilot_user_id', userId)
      .eq('fk_owner_id', ownerId)
      .gte('actual_start', `${currentYear}-01-01`)
      .lte('actual_start', `${currentYear}-12-31`);

    if (error) {
      console.error('Error getting pilot total:', error);
      return { total_missions: 0, total_hours: 0, total_distance: 0 };
    }

    const total_missions = data?.length || 0;
    const total_time = data?.reduce((sum, m) => sum + (m.flight_duration || 0), 0) || 0;
    const total_hours = Math.floor(total_time / 60);
    const total_distance = data?.reduce((sum, m) => sum + (m.distance_flown || 0), 0) || 0;

    return { total_missions, total_hours, total_distance };
  } catch (error) {
    console.error('Error in getPilotTotal:', error);
    return { total_missions: 0, total_hours: 0, total_distance: 0 };
  }
}