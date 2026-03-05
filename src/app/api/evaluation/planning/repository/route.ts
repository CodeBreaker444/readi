import { getMissionTestRepositoryFiles, getRepositoryList } from "@/backend/services/planning/planning-dashboard";
import { getUserSession } from "@/lib/auth/server-session";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  id: z.number().int().positive("Planning ID is required").optional(),
  repository_type: z.enum(["mission_planning_logbook", "mission_planning_test_logbook"]),
});

export async function POST(request: Request) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, message: "Unauthorized" },
        { status: 401 }
      );
    }

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
    const ownerId = session.user.ownerId;

    let data;

    if (repository_type === "mission_planning_test_logbook" && id) {
      data = await getMissionTestRepositoryFiles(ownerId, id);
    } else {
      data = await getRepositoryList(ownerId, repository_type, id);
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