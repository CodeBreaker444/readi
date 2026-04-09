import { listFlightRequests } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const status = body?.status ?? 'ALL';

    const items = await listFlightRequests(session!.user.ownerId, status);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
