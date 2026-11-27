import {
  getFlightRequestById,
  getMissionFlightLogs,
  resolveMissionIdForRequest,
} from '@/backend/services/mission/flight-request-service';
import { apiError, internalError } from '@/lib/api-error';
import { requireFeatureView } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireFeatureView('operation_flight_requests');
    if (error) return error;

    const requestId = Number((await params).id);
    if (!requestId || requestId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid request ID' }, { status: 400 });
    }

    // Resolve flight_request → planning_id
    const fr = await getFlightRequestById(requestId, session!.user.ownerId);

    if (!fr) {
     return apiError(E.NF021, 404);
    }
    if (!fr.fk_pilot_mission_id && !fr.fk_planning_id) {
      return NextResponse.json({ code: 1, has_log: false, logs: [], reason: 'not_assigned' });
    }

    // Linked mission, or (legacy) the planning's first mission
    const missionId = await resolveMissionIdForRequest(fr);

    if (!missionId) {
      return NextResponse.json({ code: 1, has_log: false, logs: [], reason: 'no_mission' });
    }

    // Get linked logs
    const logs = await getMissionFlightLogs(missionId);
    const hasFlytbaseLog = logs.some((l) => !!l.flytbase_flight_id);

    return NextResponse.json({
      code: 1,
      has_log: hasFlytbaseLog,
      logs,
      mission_id: missionId,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
