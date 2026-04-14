import { getMissionPlanningLogbookList } from "@/backend/services/logbook/mission-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

const filterParamsSchema = z.object({
  client_id: z.coerce.number().int().optional().default(0),
  evaluation_id: z.coerce.number().int().optional().default(0),
  planning_id: z.coerce.number().int().optional().default(0),
  user_id: z.coerce.number().int().optional().default(0),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_logbooks');
    if (error) return error;
    const body = await request.json();
    const parsed = filterParamsSchema.safeParse(body);

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;

    const result = await getMissionPlanningLogbookList({ ...parsed.data, owner_id: ownerId });

    return NextResponse.json({ code: 200, data: result.data }, { status: 200 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}