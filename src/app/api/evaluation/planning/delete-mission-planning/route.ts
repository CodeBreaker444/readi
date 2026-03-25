import { deleteMissionPlanningLogbook } from "@/backend/services/planning/planning-dashboard";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  mission_planning_id: z.number(),
});

export async function POST(request: Request) {
  try {
     const { session, error } = await requirePermission('view_planning');
        if (error) return error;
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: parsed.error  },
        { status: 400 }
      );
    }

    await deleteMissionPlanningLogbook(session!.user.ownerId,parsed.data.mission_planning_id);

    return NextResponse.json({ code: 1, message: "Deleted" });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}