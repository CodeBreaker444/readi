import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface PostFlightData {
  flight_duration: number | null;
  actual_start: string | null;
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
  const row = await prisma.pilot_mission.findUniqueOrThrow({
    where: { pilot_mission_id: missionId },
    select: {
      flight_duration: true,
      actual_start: true,
      actual_end: true,
      distance_flown: true,
      battery_charge_start: true,
      battery_charge_end: true,
      incident_flag: true,
      rth_unplanned: true,
      link_loss: true,
      deviation_flag: true,
      weather_temperature: true,
      notes: true,
      fk_mission_result_type_id: true,
    },
  });

  return {
    flight_duration: row.flight_duration,
    actual_start: row.actual_start?.toISOString() ?? null,
    actual_end: row.actual_end?.toISOString() ?? null,
    distance_flown: row.distance_flown !== null ? Number(row.distance_flown) : null,
    battery_charge_start: row.battery_charge_start !== null ? Number(row.battery_charge_start) : null,
    battery_charge_end: row.battery_charge_end !== null ? Number(row.battery_charge_end) : null,
    incident_flag: row.incident_flag,
    rth_unplanned: row.rth_unplanned,
    link_loss: row.link_loss,
    deviation_flag: row.deviation_flag,
    weather_temperature: row.weather_temperature !== null ? Number(row.weather_temperature) : null,
    notes: row.notes,
    fk_mission_result_type_id: row.fk_mission_result_type_id,
  };
}

export async function updatePostFlightData(
  missionId: number,
  payload: PostFlightUpdatePayload
): Promise<void> {
  const data: Prisma.pilot_missionUpdateInput = {};

  if (payload.flight_duration !== undefined) data.flight_duration = payload.flight_duration;
  if (payload.actual_start !== undefined) data.actual_start = payload.actual_start ? new Date(payload.actual_start) : null;
  if (payload.actual_end !== undefined) data.actual_end = payload.actual_end ? new Date(payload.actual_end) : null;
  if (payload.distance_flown !== undefined) data.distance_flown = payload.distance_flown;
  if (payload.battery_charge_start !== undefined) data.battery_charge_start = payload.battery_charge_start;
  if (payload.battery_charge_end !== undefined) data.battery_charge_end = payload.battery_charge_end;
  if (payload.incident_flag !== undefined) data.incident_flag = payload.incident_flag;
  if (payload.rth_unplanned !== undefined) data.rth_unplanned = payload.rth_unplanned;
  if (payload.link_loss !== undefined) data.link_loss = payload.link_loss;
  if (payload.deviation_flag !== undefined) data.deviation_flag = payload.deviation_flag;
  if (payload.weather_temperature !== undefined) data.weather_temperature = payload.weather_temperature;
  if (payload.notes !== undefined) data.notes = payload.notes;
  if (payload.fk_mission_result_type_id !== undefined) {
    data.pilot_mission_result_type = payload.fk_mission_result_type_id
      ? { connect: { result_type_id: payload.fk_mission_result_type_id } }
      : { disconnect: true };
  }

  await prisma.pilot_mission.update({
    where: { pilot_mission_id: missionId },
    data,
  });
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
  const resultType = await prisma.pilot_mission_result_type.findUnique({
    where: { result_type_id: resultTypeId },
    select: { result_type_desc: true },
  });

  const resultMetadata = {
    flight_duration_min: metadata.flight_duration ?? null,
    distance_flown_m: metadata.distance_flown ?? null,
    battery_charge_start: metadata.battery_charge_start ?? null,
    battery_charge_end: metadata.battery_charge_end ?? null,
  };

  const record = {
    result_type: resultType?.result_type_desc ?? null,
    result_description: metadata.notes ?? null,
    processing_status: 'completed',
    quality_score: computeQualityScore({
      incident_flag: metadata.incident_flag,
      rth_unplanned: metadata.rth_unplanned,
      link_loss: metadata.link_loss,
      deviation_flag: metadata.deviation_flag,
    }),
    result_metadata: resultMetadata as unknown as Prisma.InputJsonValue,
  };

  const existing = await prisma.pilot_mission_result.findFirst({
    where: { fk_pilot_mission_id: missionId },
    select: { result_id: true },
  });

  if (existing) {
    await prisma.pilot_mission_result.update({
      where: { result_id: existing.result_id },
      data: record,
    });
  } else {
    await prisma.pilot_mission_result.create({
      data: { fk_pilot_mission_id: missionId, ...record },
    });
  }
}
