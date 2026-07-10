import { updateComponentMaintenanceCycle } from "@/backend/services/operation/maintenance-cycle-service";
import { requireAnyFeatureAccess, requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const componentSchema = z.object({
  component_id: z.number().int().positive(),
  add_flights: z.number().min(0).default(0),
  add_hours: z.number().min(0).default(0),
  manual_cycles_input: z.boolean().optional(),
});

const bodySchema = z.object({
  tool_id: z.number().int().positive(),
  mission_id: z.number().int().positive(),
  components: z.array(componentSchema).min(1),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requirePermission('view_operations');
  if (error) return error;

  const { error: featureError } = await requireAnyFeatureAccess(
    ['operation_daily_board', 'operation_mission_table', 'operation_calendar', 'control_center_recent_flights'],
    'edit'
  );
  if (featureError) return featureError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: 0, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 0, message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await updateComponentMaintenanceCycle(
      parsed.data.tool_id,
      parsed.data.mission_id,
      session!.user.ownerId,
      parsed.data.components
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}