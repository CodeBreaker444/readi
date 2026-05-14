import { sendMaintenanceAlertNotifications } from "@/backend/services/system/maintenance-notification";
import { getMaintenanceDashboard } from "@/backend/services/system/maintenance-service";
import { internalError, zodError } from "@/lib/api-error";
import { requirePermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
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
      return zodError(E.VL001, parsed.error);
    }

    const data = await getMaintenanceDashboard({
      owner_id,
      client_id,
      threshold_alert: parsed.data.threshold_alert,
    });

    sendMaintenanceAlertNotifications(owner_id, data).catch((err) =>
      console.error("[maintenance-alert] notification failed:", err)
    );

    return NextResponse.json({
      code: 1,
      message: "success",
      dataRows: data.length,
      data,
    });
  } catch (error) {
    return internalError(E.SV001, error);
  }
}