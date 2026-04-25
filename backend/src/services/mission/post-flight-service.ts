import { supabase } from '@/backend/database/database';

export interface PostFlightData {
  flight_duration: number | null;
  actual_end: string | null;
  distance_flown: number | null;
  battery_charge_start: number | null;
  battery_charge_end: number | null;
  incident_flag: boolean | null;
  rth_unplanned: boolean | null;
  link_loss: boolean | null;
  deviation_flag: boolean | null;
  weather_temperature: number | null;
  notes: string | null;
  fk_mission_result_type_id: number | null;
}

export interface PostFlightUpdatePayload extends Partial<PostFlightData> {}

export async function getPostFlightData(missionId: number): Promise<PostFlightData> {
  const { data, error } = await supabase
    .from('pilot_mission')
    .select(
      'flight_duration, actual_end, distance_flown, battery_charge_start, battery_charge_end, incident_flag, rth_unplanned, link_loss, deviation_flag, weather_temperature, notes, fk_mission_result_type_id'
    )
    .eq('pilot_mission_id', missionId)
    .single();

  if (error) throw error;
  return data as PostFlightData;
}

export async function updatePostFlightData(
  missionId: number,
  payload: PostFlightUpdatePayload
): Promise<void> {
  const { error } = await supabase
    .from('pilot_mission')
    .update(payload)
    .eq('pilot_mission_id', missionId);

  if (error) throw error;
}
