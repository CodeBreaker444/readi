import { upsertChartOverride, updateUserPosition } from "@/backend/services/organization/chart-override-service";
import { requireFeatureAccess, requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateNodeSchema = z.object({
  userId: z.number().int().positive(),
  position: z.string().min(1, "Position is required").max(100),
  parentUserId: z.number().int().positive().nullable(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requirePermission("view_config");
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess("org_chart", "edit");
    if (featureError) return featureError;

    const body = await request.json();
    const parsed = updateNodeSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const ownerId = session!.user.ownerId;
    const { userId, position, parentUserId } = parsed.data;

    await updateUserPosition(ownerId, userId, position);
    await upsertChartOverride({ owner_id: ownerId, user_id: userId, parent_user_id: parentUserId });

    return NextResponse.json({ code: 1, message: "Chart node updated successfully" });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
