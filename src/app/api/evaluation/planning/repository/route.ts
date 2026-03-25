import { getMissionPlanningLogbookFiles } from "@/backend/services/planning/evaluation";
import { getMissionTestRepositoryFiles } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  id: z.number().int().positive("Planning ID is required").optional(),
  repository_type: z.enum(["mission_planning_logbook", "mission_planning_test_logbook"]),
});

export async function POST(request: Request) {
  try {
    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          message: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { id, repository_type } = parsed.data;
    const ownerId = session!.user.ownerId;

    let data;

    if (repository_type === "mission_planning_test_logbook" && id) {
      data = await getMissionTestRepositoryFiles(ownerId, id);
    } else {
      data = await getMissionPlanningLogbookFiles(ownerId, id);
    }

    return NextResponse.json({
      code: 1,
      message: "Success",
      data,
      dataRows: data.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, message: err.message },
      { status: 500 }
    );
  }
}