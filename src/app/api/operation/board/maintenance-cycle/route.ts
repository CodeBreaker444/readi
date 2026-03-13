import { getComponentsForMaintenanceCycle } from "@/backend/services/operation/maintenance-cycle-service";
import { getUserSession } from "@/lib/auth/server-session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const toolId = Number(req.nextUrl.searchParams.get("tool_id"));
  if (!toolId || toolId <= 0) {
    return NextResponse.json(
      { code: 0, message: "tool_id is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getComponentsForMaintenanceCycle(
      toolId,
      session.user.ownerId
    );
    return NextResponse.json({ code: 1, message: "Success", data });
  } catch (error) {
    console.error("[maintenance-cycle] GET error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
