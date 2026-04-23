import { supabase } from "@/backend/database/database";
import { getMissionResultList } from "@/backend/services/mission/result-service";
import { internalError } from "@/lib/api-error";
import { requirePermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { session, error } = await requirePermission("view_operations");
  if (error) return error;

  const missionId = parseInt(req.nextUrl.searchParams.get("mission_id") ?? "", 10);
  if (isNaN(missionId)) {
    return NextResponse.json({ code: 0, message: "mission_id is required" }, { status: 400 });
  }

  try {
    const [missionRes, resultsRes] = await Promise.all([
      supabase
        .from("pilot_mission")
        .select("flight_duration, actual_start, actual_end, distance_flown, notes, fk_mission_result_type_id")
        .eq("pilot_mission_id", missionId)
        .single(),
      getMissionResultList(session!.user.ownerId),
    ]);

    if (missionRes.error) {
      return NextResponse.json({ code: 0, message: missionRes.error.message }, { status: 422 });
    }

    return NextResponse.json({
      code: 1,
      data: {
        flight: missionRes.data,
        result_options: resultsRes.data,
      },
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

const postFlightSchema = z.object({
  mission_id: z.number().int().positive(),
  flight_duration: z.number().nonnegative().nullable().optional(),
  actual_start: z.string().nullable().optional(),
  actual_end: z.string().nullable().optional(),
  distance_flown: z.number().nonnegative().nullable().optional(),
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
    return NextResponse.json({ code: 0, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postFlightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 0, message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mission_id, ...fields } = parsed.data;
  const payload: Record<string, unknown> = {};
  if (fields.flight_duration !== undefined) payload.flight_duration = fields.flight_duration;
  if (fields.actual_start !== undefined) payload.actual_start = fields.actual_start || null;
  if (fields.actual_end !== undefined) payload.actual_end = fields.actual_end || null;
  if (fields.distance_flown !== undefined) payload.distance_flown = fields.distance_flown;
  if (fields.notes !== undefined) payload.notes = fields.notes || null;
  if (fields.fk_mission_result_type_id !== undefined)
    payload.fk_mission_result_type_id = fields.fk_mission_result_type_id;

  try {
    const { error: updateError } = await supabase
      .from("pilot_mission")
      .update(payload)
      .eq("pilot_mission_id", mission_id);

    if (updateError) {
      return NextResponse.json({ code: 0, message: updateError.message }, { status: 422 });
    }

    return NextResponse.json({ code: 1, message: "Post-flight data saved successfully" });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
