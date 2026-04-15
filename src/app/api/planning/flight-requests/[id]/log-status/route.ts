import {
  getFlightRequestById,
  getMissionFlightLogs,
  getPilotMissionByPlanningId,
} from '@/backend/services/mission/flight-request-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const requestId = Number((await params).id);
    if (!requestId || requestId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid request ID' }, { status: 400 });
    }

    // Resolve flight_request → planning_id
    const fr = await getFlightRequestById(requestId, session!.user.ownerId);

    if (!fr) {
      return NextResponse.json({ code: 0, error: 'Flight request not found' }, { status: 404 });
    }
    if (!fr.fk_planning_id) {
      return NextResponse.json({ code: 1, has_log: false, logs: [], reason: 'not_assigned' });
    }

    // Resolve planning_id → pilot_mission_id
    const pm = await getPilotMissionByPlanningId(fr.fk_planning_id);

    if (!pm) {
      return NextResponse.json({ code: 1, has_log: false, logs: [], reason: 'no_mission' });
    }

    // Get linked logs
    const logs = await getMissionFlightLogs(pm.pilot_mission_id);

    return NextResponse.json({
      code: 1,
      has_log: logs.length > 0,
      logs,
      mission_id: pm.pilot_mission_id,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
