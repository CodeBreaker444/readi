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

function computeQualityScore(flags: {
  incident_flag?: boolean | null;
  rth_unplanned?: boolean | null;
  link_loss?: boolean | null;
  deviation_flag?: boolean | null;
}): number {
  let score = 100;
  if (flags.incident_flag) score -= 30;
  if (flags.rth_unplanned) score -= 20;
  if (flags.link_loss) score -= 20;
  if (flags.deviation_flag) score -= 10;
  return Math.max(0, score);
}

export async function upsertMissionResult(
  missionId: number,
  resultTypeId: number,
  metadata: {
    flight_duration?: number | null;
    distance_flown?: number | null;
    battery_charge_start?: number | null;
    battery_charge_end?: number | null;
    notes?: string | null;
    incident_flag?: boolean | null;
    rth_unplanned?: boolean | null;
    link_loss?: boolean | null;
    deviation_flag?: boolean | null;
  }
): Promise<void> {
  const { data: resultType } = await supabase
    .from('pilot_mission_result_type')
    .select('result_type_desc')
    .eq('result_type_id', resultTypeId)
    .single();

  const record = {
    fk_pilot_mission_id: missionId,
    result_type: resultType?.result_type_desc ?? null,
    result_description: metadata.notes ?? null,
    processing_status: 'completed',
    quality_score: computeQualityScore({
      incident_flag: metadata.incident_flag,
      rth_unplanned: metadata.rth_unplanned,
      link_loss: metadata.link_loss,
      deviation_flag: metadata.deviation_flag,
    }),
    result_metadata: {
      flight_duration_min: metadata.flight_duration ?? null,
      distance_flown_m: metadata.distance_flown ?? null,
      battery_charge_start: metadata.battery_charge_start ?? null,
      battery_charge_end: metadata.battery_charge_end ?? null,
    },
  };

  const { data: existing } = await supabase
    .from('pilot_mission_result')
    .select('result_id')
    .eq('fk_pilot_mission_id', missionId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('pilot_mission_result')
      .update(record)
      .eq('result_id', existing.result_id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('pilot_mission_result')
      .insert(record);
    if (error) throw error;
  }
}
