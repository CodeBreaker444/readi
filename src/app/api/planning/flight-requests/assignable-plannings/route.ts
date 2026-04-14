import { listAssignablePlannings } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const items = await listAssignablePlannings(session!.user.ownerId);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
