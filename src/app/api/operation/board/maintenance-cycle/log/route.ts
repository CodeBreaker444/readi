import { getMissionMaintenanceLog } from "@/backend/services/operation/maintenance-cycle-service";
import { apiError, internalError } from "@/lib/api-error";
import { requirePermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { error } = await requirePermission("view_operations");
  if (error) return error;

  const missionId = parseInt(req.nextUrl.searchParams.get("mission_id") ?? "", 10);
  if (isNaN(missionId)) {
    return apiError(E.VL002, 400);
  }

  try {
    const data = await getMissionMaintenanceLog(missionId);
    return NextResponse.json({ code: 1, message: "Success", data });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
