import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MaintenanceDashboardSchema = z.object({
  threshold_alert: z
    .union([z.number(), z.string().transform(Number)])
    .pipe(z.number().int().min(1))
    .default(80),
});

export async function POST(req: NextRequest) {
  try {
    
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    
    const body = await req.json()
    const owner_id: number  = session!.user.ownerId;
    const client_id: number = session!.user.clientId ;

    const parsed = MaintenanceDashboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          message: "Validation error",
          errors: parsed.error.flatten((i) => i.message).fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = await getMaintenanceDashboard({
      owner_id,
      client_id,
      threshold_alert: parsed.data.threshold_alert,});

    return NextResponse.json({
      code: 1,
      message: "success",
      dataRows: data.length,
      data,
    });
  } catch (error) {
    console.error("[maintenance/dashboard] error:", error);
    return NextResponse.json(
      {
        code: 0,
        message:
          error instanceof Error ? error.message : "Internal server error",
        data: [],
        dataRows: 0,
      },
      { status: 500 }
    );
  }
}