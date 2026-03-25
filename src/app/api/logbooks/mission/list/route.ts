import { getMissionPlanningLogbookList } from "@/backend/services/logbook/mission-service";
import { requirePermission } from "@/lib/auth/api-auth";
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
      return NextResponse.json(
        {
          code: 0,
          status: "VALIDATION_ERROR",
          message: parsed.error.message ?? "Invalid input",
          errors: parsed.error.flatten().fieldErrors,
          dataRows: 0,
          data: [],
        },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;

    const result = await getMissionPlanningLogbookList({ ...parsed.data, owner_id: ownerId });

    return NextResponse.json({ code: 200, data: result.data }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      {
        code: 0,
        status: "ERROR",
        message: err?.message ?? "Internal server error",
        dataRows: 0,
        data: [],
      },
      { status: 500 }
    );
  }
}