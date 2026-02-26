import { getOperationLogbookList } from "@/backend/services/logbook/flight-logbook-service";
import { getUserSession } from "@/lib/auth/server-session";
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
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: "UNAUTHORIZED", message: "Not authenticated", dataRows: 0, data: [] },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          status: "VALIDATION_ERROR",
          message: "Invalid input",
          errors: parsed.error.flatten().fieldErrors,
          dataRows: 0,
          data: [],
        },
        { status: 400 }
      );
    }

    const result = await getOperationLogbookList({
      ...parsed.data,
      owner_id: session.user.ownerId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { code: 0, status: "ERROR", message: err?.message ?? "Internal server error", dataRows: 0, data: [] },
      { status: 500 }
    );
  }
}