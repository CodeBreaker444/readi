import { deleteMissionPlanningLogbook } from "@/backend/services/planning/mission-test-logbook";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const DeleteSchema = z.object({
  missionPlanningId: z
    .number()
    .int()
    .positive("Mission planning ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;
    const result = await deleteMissionPlanningLogbook(
      ownerId,
      parsed.data.missionPlanningId
    );

    return NextResponse.json({
      success: true,
      message: "Mission planning logbook entry deleted",
      data: result,
    });
  } catch (error) {
    console.error("DELETE mission-planning-logbook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}