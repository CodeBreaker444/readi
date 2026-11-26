import { createAndAttachMission } from '@/backend/services/operation/mission-service';
import { buildInitialApproval, notifyApprovalRequested } from '@/backend/services/operation/mission-approval-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError } from '@/lib/api-error';
import { canChangePilot } from '@/lib/auth/pilot-assignment';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const body = await req.json();
    const {
      mission_code,
      mission_name,
      scheduled_start,
      fk_pilot_user_id,
      fk_tool_id,
      fk_client_id,
      fk_mission_type_id,
      fk_mission_category_id,
      fk_planning_id,
      fk_luc_procedure_id,
      location,
      notes,
      status_name,
      actual_start,
      actual_end,
      flight_id,
      op_type,
    } = body;

    if (!mission_code || !flight_id || !fk_luc_procedure_id) {
      return NextResponse.json(
        { code: 0, message: 'Missing required fields: mission_code, flight_id, fk_luc_procedure_id' },
        { status: 400 }
      );
    }

    if (fk_pilot_user_id && !canChangePilot(session!.user, Number(fk_pilot_user_id), null)) {
      return apiError(E.PX007, 403);
    }

    const userId = session!.user.userId;
    const ownerId = session!.user.ownerId;

    // Pilots' missions need OPM approval; they cannot be created already started.
    const approval = await buildInitialApproval(session!.user);
    if (approval && status_name === 'IN_PROGRESS') {
      return NextResponse.json(
        { code: 0, message: 'This mission needs OPM approval before it can be started.', errorCode: 'OPM_APPROVAL_REQUIRED' },
        { status: 422 }
      );
    }

    const result = await createAndAttachMission(
      {
        mission_code,
        mission_name,
        scheduled_start,
        fk_pilot_user_id,
        fk_tool_id,
        fk_client_id,
        fk_mission_type_id,
        fk_mission_category_id,
        fk_planning_id,
        fk_luc_procedure_id,
        location,
        notes,
        status_name,
        actual_start,
        actual_end,
        flight_id,
        op_type,
      },
      userId,
      ownerId,
      approval
    );

    if (approval) {
      try {
        await notifyApprovalRequested(session!.user, [{ pilot_mission_id: result.mission_id, mission_code: result.mission_code }]);
      } catch (notifyErr) {
        console.warn('[create-and-attach] approval notification failed (non-fatal):', notifyErr);
      }
    }

    return NextResponse.json({
      code: 1,
      message: 'Mission created and flight log attached successfully',
      data: result,
    });
  } catch (err) {
    console.error('[POST /api/operation/missions/create-and-attach]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith('No system is present')) {
      return NextResponse.json({ code: 0, message }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
