import { canDecideApproval, listInternalRequests } from '@/backend/services/operation/mission-approval-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

/** Internal flight requests: pilot-created missions awaiting (or decided by) an OPM. */
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations_full');
    if (error) return error;

    if (!canDecideApproval(session!.user)) {
      return NextResponse.json({ code: 1, items: [], dataRows: 0 });
    }

    const status = req.nextUrl.searchParams.get('status') ?? 'ALL';
    const items = await listInternalRequests(session!.user, status);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
