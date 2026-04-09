import { getFlightRequestsByPlanningId } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { id } = await params;
    const planningId = Number(id);
    if (isNaN(planningId) || planningId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid evaluation id' }, { status: 400 });
    }

    const items = await getFlightRequestsByPlanningId(planningId, session!.user.ownerId);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
