import { getFlightLogsForMission } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number(req.nextUrl.searchParams.get('mission_id'));
    if (!missionId || missionId <= 0) {
      return NextResponse.json({ code: 0, message: 'mission_id is required' }, { status: 400 });
    }

    const logs = await getFlightLogsForMission(missionId);
    return NextResponse.json({ code: 1, data: logs });
  } catch (err) {
    console.error('[flight-logs] GET error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
