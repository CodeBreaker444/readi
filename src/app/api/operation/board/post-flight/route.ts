import { getPostFlightData, updatePostFlightData } from "@/backend/services/mission/post-flight-service";
import { getMissionResultList } from "@/backend/services/mission/result-service";
import { apiError, dbError, internalError, notFound, zodError } from "@/lib/api-error";
import { requirePermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePermission("view_operations");
  if (error) return error;

  const missionId = parseInt(req.nextUrl.searchParams.get("mission_id") ?? "", 10);
  if (isNaN(missionId)) {
    return apiError(E.VL002, 400);
  }

  try {
    const [flightData, resultsRes] = await Promise.all([
      getPostFlightData(missionId),
      getMissionResultList(session!.user.ownerId),
    ]);

    return NextResponse.json({
      code: 1,
      data: {
        flight: flightData,
        result_options: resultsRes.data,
      },
    });
  } catch (err) {
    const supaErr = err as { code?: string } | null;
    if (supaErr?.code === 'PGRST116') return notFound(E.NF003);
    if (supaErr?.code) return dbError(E.DB001, err);
    return internalError(E.SV001, err);
  }
}

const postFlightSchema = z.object({
  mission_id: z.number().int().positive(),
  flight_duration: z.number().nonnegative().nullable().optional(),
  actual_end: z.string().nullable().optional(),
  distance_flown: z.number().nonnegative().nullable().optional(),
  battery_charge_start: z.number().min(0).max(100).nullable().optional(),
  battery_charge_end: z.number().min(0).max(100).nullable().optional(),
  incident_flag: z.boolean().nullable().optional(),
  rth_unplanned: z.boolean().nullable().optional(),
  link_loss: z.boolean().nullable().optional(),
  deviation_flag: z.boolean().nullable().optional(),
  weather_temperature: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  fk_mission_result_type_id: z.number().int().positive().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const { error } = await requirePermission("view_operations");
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError(E.VL001, 400);
  }

  const parsed = postFlightSchema.safeParse(body);
  if (!parsed.success) {
    return zodError(E.VL011, parsed.error);
  }

  const { mission_id, ...fields } = parsed.data;
  const payload: Record<string, unknown> = {};
  if (fields.flight_duration !== undefined) payload.flight_duration = fields.flight_duration;
  if (fields.actual_end !== undefined) payload.actual_end = fields.actual_end || null;
  if (fields.distance_flown !== undefined) payload.distance_flown = fields.distance_flown;
  if (fields.battery_charge_start !== undefined) payload.battery_charge_start = fields.battery_charge_start;
  if (fields.battery_charge_end !== undefined) payload.battery_charge_end = fields.battery_charge_end;
  if (fields.incident_flag !== undefined) payload.incident_flag = fields.incident_flag;
  if (fields.rth_unplanned !== undefined) payload.rth_unplanned = fields.rth_unplanned;
  if (fields.link_loss !== undefined) payload.link_loss = fields.link_loss;
  if (fields.deviation_flag !== undefined) payload.deviation_flag = fields.deviation_flag;
  if (fields.weather_temperature !== undefined) payload.weather_temperature = fields.weather_temperature;
  if (fields.notes !== undefined) payload.notes = fields.notes || null;
  if (fields.fk_mission_result_type_id !== undefined)
    payload.fk_mission_result_type_id = fields.fk_mission_result_type_id;

  try {
    await updatePostFlightData(mission_id, payload);
    return NextResponse.json({ code: 1, message: "Post-flight data saved successfully" });
  } catch (err) {
    const supaErr = err as { code?: string } | null;
    if (supaErr?.code) return dbError(E.DB003, err);
    return internalError(E.SV001, err);
  }
}
