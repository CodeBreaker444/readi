import { notifyDccLogging } from '@/backend/services/mission/dcc-callback-service';
import { attachFlytbaseFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const body = await req.json();
    const missionId = Number(body.mission_id);
    const flightId = String(body.flight_id ?? '').trim();

    if (!missionId || missionId <= 0) {
      return NextResponse.json({ code: 0, message: 'mission_id is required' }, { status: 400 });
    }
    if (!flightId) {
      return NextResponse.json({ code: 0, message: 'flight_id is required' }, { status: 400 });
    }

    await attachFlytbaseFlightLog(missionId, session!.user.userId, flightId);

    // Notify DCC with the FlytBase flight report URI — non-blocking
    const logUri = `${process.env.FLYTBASE_URL ?? ''}/v2/flight/report/download/gutma?flightIds=${encodeURIComponent(flightId)}`;
    notifyDccLogging(missionId, logUri).catch(() => {});

    return NextResponse.json({ code: 1, message: 'Flight log attached from FlytBase' });
  } catch (err: any) {
    console.error('[flight-logs/flytbase] POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      err?.code === 'FLYTBASE_TIMEOUT'   ? 504 :
      message.includes('No FlytBase')    ? 422 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}
