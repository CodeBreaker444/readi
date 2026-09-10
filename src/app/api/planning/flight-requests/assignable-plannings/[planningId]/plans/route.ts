import { listPlansForPlanning } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planningId: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const planningId = Number((await params).planningId);
    if (!planningId || planningId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid planning ID' }, { status: 400 });
    }

    const items = await listPlansForPlanning(planningId, session!.user.ownerId);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
