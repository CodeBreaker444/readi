import { requestSkipsOpmApproval } from '@/backend/services/mission/flight-request-mission-service';
import { getApprovalEligibility } from '@/backend/services/operation/mission-approval-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Tells the mission creation modal whether approval applies and whether an OPM exists to give it.
 * With ?flight_request_id=&tool_id=, a mission for a zone-validated flight request flown with a
 * system whose zones cover the request needs no approval (zone_validated: true).
 */
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const params = req.nextUrl.searchParams;
    const flightRequestId = Number(params.get('flight_request_id'));
    const toolId = Number(params.get('tool_id'));
    if (Number.isInteger(flightRequestId) && flightRequestId > 0 && Number.isInteger(toolId) && toolId > 0) {
      const covered = await requestSkipsOpmApproval(flightRequestId, session!.user.ownerId, toolId);
      if (covered) return NextResponse.json({ code: 1, required: false, department: null, opmCount: 0, zone_validated: true });
    }

    const eligibility = await getApprovalEligibility(session!.user);
    return NextResponse.json({ code: 1, ...eligibility, zone_validated: false });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
