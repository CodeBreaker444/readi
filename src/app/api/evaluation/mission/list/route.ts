import { getMissionTestLogbookList } from "@/backend/services/planning/mission-test-logbook";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  mission_planning_id: z.number().int().positive("Mission planning ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { mission_planning_id } = parsed.data;
    const ownerId = session!.user.ownerId;

    const data = await getMissionTestLogbookList(ownerId, mission_planning_id);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET mission-test-logbook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}