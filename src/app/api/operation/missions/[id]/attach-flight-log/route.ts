import { attachFlytbaseFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number((await params).id);
    if (!missionId || missionId <= 0) {
      return NextResponse.json({ code: 0, message: 'Invalid mission ID' }, { status: 400 });
    }

    const body = await req.json();
    const flightId = String(body.flight_id ?? '').trim();
    const organizationId = body.organization_id ? Number(body.organization_id) || null : null;

    if (!flightId) {
      return NextResponse.json({ code: 0, message: 'flight_id is required' }, { status: 400 });
    }

    const result = await attachFlytbaseFlightLog(missionId, session!.user.userId, session!.user.ownerId, flightId, organizationId);
    return NextResponse.json({
      code: 1,
      message: 'Flight log attached to mission',
      serialNumberMismatch: result.serialNumberMismatch,
    });
  } catch (err: any) {
    console.error('[POST /api/operation/missions/[id]/attach-flight-log] error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      err?.code === 'FLYTBASE_TIMEOUT'   ? 504 :
      message.includes('No FlytBase')    ? 422 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}
