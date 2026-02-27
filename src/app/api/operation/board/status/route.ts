import { updateMissionStatus } from "@/backend/services/operation/operation-board-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  mission_id: z.number().int().positive(),
  vehicle_id: z.number().int().positive(),
  status_id: z.number().int(),
  workflow_mission_status: z.enum(["_START", "_END"]),
  pilot_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 0, message: "Invalid JSON body" }, { status: 400 });
  }

   const session = await getUserSession()
  if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 0, message: "Validation error", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await updateMissionStatus({...parsed.data, owner_id:session.user.ownerId, pilot_id: session.user.userId});
    return NextResponse.json(result, { status: result.code === 1 ? 200 : 422 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}