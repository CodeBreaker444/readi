import { logEvent } from "@/backend/services/auditLog/audit-log";
import type { DccCallbackResult } from "@/types/dcc-callback";
import { notifyDccExecution, notifyDccTermination } from "@/backend/services/mission/dcc-callback-service";
import { updateMissionStatus } from "@/backend/services/operation/operation-board-service";
import { checkDailyDeclaration } from "@/backend/services/operation/pilot-declaration-service";
import { requirePermission } from "@/lib/auth/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  mission_id: z.number().int().positive(),
  vehicle_id: z.number().int().positive().nullable(),
  status_id: z.number().int(),
  workflow_mission_status: z.enum(["_START", "_END", "_REVERT"]),
  pilot_id: z.number().int().positive().nullable(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 0, message: "Invalid JSON body" }, { status: 400 });
  }

  const { session, error } = await requirePermission('view_operations');
  if (error) return error;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 0, message: "Validation error", errors: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.workflow_mission_status === "_START") {
      const hasDeclared = await checkDailyDeclaration(session!.user.userId);
      if (!hasDeclared) {
        return NextResponse.json(
          { code: 0, message: "Daily declaration not found", check_daily_declaration: "N" },
          { status: 422 }
        );
      }
    }

    const result = await updateMissionStatus({ ...parsed.data, owner_id: session!.user.ownerId });

    let dcc: DccCallbackResult | undefined;

    if (result.code === 1) {
      const actionMap: Record<string, string> = {
        _START: 'started',
        _END: 'completed',
        _REVERT: 'reverted to in-progress',
      };
      logEvent({
        eventType: 'UPDATE',
        entityType: 'operation',
        entityId: parsed.data.mission_id,
        description: `Mission #${parsed.data.mission_id} ${actionMap[parsed.data.workflow_mission_status] ?? 'status updated'}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });

      if (parsed.data.workflow_mission_status === '_START') {
        dcc = await notifyDccExecution(parsed.data.mission_id);
      } else if (parsed.data.workflow_mission_status === '_END') {
        dcc = await notifyDccTermination(parsed.data.mission_id, 1);
      }
    }

    return NextResponse.json(
      dcc ? { ...result, dcc } : result,
      { status: result.code === 1 ? 200 : 422 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}