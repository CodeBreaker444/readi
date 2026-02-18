import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { getUserSession } from "@/lib/auth/server-session";
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
    const body = await req.json()
    const session = await getUserSession();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json(
        { code: 0, message: "Unauthorized", data: [], dataRows: 0 },
        { status: 401 }
      );
    }

    const owner_id: number  = session.user.ownerId  
    const client_id: number = session.user.userId 

    const parsed = MaintenanceDashboardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 0,
          message: "Validation error",
          errors: parsed.error.flatten().fieldErrors,
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