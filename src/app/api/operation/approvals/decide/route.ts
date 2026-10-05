import { logEvent } from '@/backend/services/auditLog/audit-log';
import { ApprovalError, decideMissionApproval } from '@/backend/services/operation/mission-approval-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({
  mission_id: z.number().int().positive(),
  decision: z.enum(['APPROVED', 'DENIED']),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations_full');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('operation_flight_requests', 'edit');
    if (featureError) return featureError;

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const { mission_id, decision, note } = parsed.data;
    const result = await decideMissionApproval(session!.user, mission_id, decision, note);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'operation',
      entityId: mission_id,
      description: `Mission #${mission_id} ${decision === 'APPROVED' ? 'approved' : 'denied'} by OPM${result.missionIds.length > 1 ? ` (${result.missionIds.length} recurring missions)` : ''}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({
      code: 1,
      message: decision === 'APPROVED' ? 'Mission approved' : 'Mission denied',
      mission_ids: result.missionIds,
      dflight_errors: result.dflightErrors.length ? result.dflightErrors : undefined,
    });
  } catch (err) {
    if (err instanceof ApprovalError) {
      return NextResponse.json({ code: 0, error: err.message }, { status: err.status });
    }
    return internalError(E.SV001, err);
  }
}
