import { deleteMissionPlanningLogbook } from "@/backend/services/planning/planning-dashboard";
import { canDelete } from "@/lib/auth/roles";
import { requirePermission } from "@/lib/auth/api-auth";
import { forbidden, internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  mission_planning_id: z.number(),
});

export async function POST(request: Request) {
  try {
     const { session, error } = await requirePermission('view_planning');
        if (error) return error;

        // Check if user has delete permissions (isViewer = true AND isManager = true)
        if (!canDelete(session!.user.isViewer, session!.user.isManager)) {
          return forbidden(E.PX001);
        }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    await deleteMissionPlanningLogbook(session!.user.ownerId,parsed.data.mission_planning_id);

    return NextResponse.json({ code: 1, message: "Deleted" });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}