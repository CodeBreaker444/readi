import { getComponentsForMaintenanceCycle } from "@/backend/services/operation/maintenance-cycle-service";
import { requirePermission } from "@/lib/auth/api-auth";
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
  } catch (error) {
    console.error("[maintenance-cycle] GET error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
