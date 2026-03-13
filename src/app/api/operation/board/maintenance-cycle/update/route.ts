import { updateComponentMaintenanceCycle } from "@/backend/services/operation/maintenance-cycle-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const componentSchema = z.object({
  component_id: z.number().int().positive(),
  add_flights: z.number().min(0).max(10).default(0),
  add_hours: z.number().min(0).max(24).default(0),
  add_days: z.number().min(0).max(30).default(0),
});

const bodySchema = z.object({
  tool_id: z.number().int().positive(),
  mission_id: z.number().int().positive(),
  components: z.array(componentSchema).min(1),
});

export async function POST(req: NextRequest) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      session.user.ownerId,
      parsed.data.components
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
