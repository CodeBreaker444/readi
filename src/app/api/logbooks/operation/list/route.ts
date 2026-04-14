import { getOperationLogbookList } from "@/backend/services/logbook/flight-logbook-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError, zodError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  pic_id: z.coerce.number().int().optional().default(0),
  vehicle_id: z.coerce.number().int().optional().default(0),
  mission_status_id: z.coerce.number().int().optional().default(0),
  mission_type_id: z.coerce.number().int().optional().default(0),
  mission_category_id: z.coerce.number().int().optional().default(0),
  mission_result_id: z.coerce.number().int().optional().default(0),
  client_id: z.coerce.number().int().optional().default(0),
  mission_plan_id: z.coerce.number().int().optional().default(0),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_logbooks');
    if (error) return error;

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const result = await getOperationLogbookList({
      ...parsed.data,
      owner_id: session!.user.ownerId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}