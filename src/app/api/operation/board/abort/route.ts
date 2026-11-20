import { logEvent } from "@/backend/services/auditLog/audit-log";
import { notifyClientMissionStatus } from "@/backend/services/mission/dcc-client-status-service";
import { prisma } from "@/lib/prisma";
import { internalError } from "@/lib/api-error";
import { requireFeatureAccess, requirePermission } from "@/lib/auth/api-auth";
import { E } from "@/lib/error-codes";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Must match the OperationStatus enum ids (see auto-abort-service / operation-service).
const ABORTED_STATUS_ID = 5;

const bodySchema = z.object({
  mission_id: z.number().int().positive(),
  reason: z.string().trim().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 0, message: "Invalid JSON body" }, { status: 400 });
  }

  const { session, error } = await requirePermission("view_operations");
  if (error) return error;

  const { error: featureError } = await requireFeatureAccess("operation_daily_board", "edit");
  if (featureError) return featureError;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ code: 0, message: "Validation error", errors: parsed.error.issues }, { status: 400 });
  }

  try {
    const { mission_id, reason } = parsed.data;
    const ownerId = session!.user.ownerId;

    const mission = await prisma.pilot_mission.findFirst({
      where: { pilot_mission_id: mission_id, fk_owner_id: ownerId },
      select: { status_name: true, mission_code: true, mission_name: true },
    });
    if (!mission) {
      return NextResponse.json({ code: 0, message: "Mission not found" }, { status: 404 });
    }
    if (mission.status_name === "ABORTED" || mission.status_name === "COMPLETED") {
      return NextResponse.json(
        { code: 0, message: `A ${mission.status_name.toLowerCase()} mission cannot be aborted` },
        { status: 422 },
      );
    }

    await prisma.pilot_mission.update({
      where: { pilot_mission_id: mission_id },
      data: {
        status_name: "ABORTED",
        fk_mission_status_id: ABORTED_STATUS_ID,
        abort_reason: reason || null,
      },
    });

    logEvent({
      eventType: "UPDATE",
      entityType: "operation",
      entityId: mission_id,
      description: `Mission ${mission.mission_code ?? `#${mission_id}`} aborted from the daily board${reason ? ` — ${reason}` : ""}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    void notifyClientMissionStatus(mission_id, "ABORTED", reason || null);

    return NextResponse.json({ code: 1, message: "Mission aborted" });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
