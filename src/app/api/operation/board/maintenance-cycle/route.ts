import { getComponentsForMaintenanceCycle } from "@/backend/services/operation/maintenance-cycle-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { internalError } from "@/lib/api-error";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const toolId = Number(req.nextUrl.searchParams.get("tool_id"));
    if (!toolId || toolId <= 0) {
      return NextResponse.json(
        { code: 0, message: "tool_id is required" },
        { status: 400 }
      );
    }

    const data = await getComponentsForMaintenanceCycle(
      toolId,
      session!.user.ownerId
    );
    return NextResponse.json({ code: 1, message: "Success", data });
  } catch (err) {
    console.error("[maintenance-cycle] GET error:", err);
    return internalError(E.SV001, err);
  }
}
