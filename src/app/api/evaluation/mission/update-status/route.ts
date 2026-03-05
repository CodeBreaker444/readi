import { updateMissionPlanningActiveStatus } from "@/backend/services/planning/mission-test-logbook";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  mission_planning_id: z.number().int().positive("Mission planning ID is required"),
  status: z.enum(["Y", "N"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;
    const userId = session.user.userId;

    await updateMissionPlanningActiveStatus(
      ownerId,
      parsed.data.mission_planning_id,
      parsed.data.status,
      userId
    );

    return NextResponse.json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("UPDATE active status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}