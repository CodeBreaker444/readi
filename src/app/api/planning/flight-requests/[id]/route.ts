import { supabase } from '@/backend/database/database';
import { updateFlightRequestStatus } from '@/backend/services/mission/flight-request-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_STATUSES = ['IN_PROGRESS', 'COMPLETED', 'ISSUE'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const requestId = Number((await params).id);
    if (!requestId || requestId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid request ID' }, { status: 400 });
    }

    const { dcc_status } = await req.json();
    if (!ALLOWED_STATUSES.includes(dcc_status)) {
      return NextResponse.json({ code: 0, error: 'Invalid status' }, { status: 400 });
    }

    await updateFlightRequestStatus(requestId, session!.user.ownerId, dcc_status);

    return NextResponse.json({ code: 1, message: 'Status updated' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const requestId = Number((await params).id);
    if (!requestId || requestId <= 0) {
      return NextResponse.json({ code: 0, error: 'Invalid request ID' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('flight_requests')
      .delete()
      .eq('request_id', requestId)
      .eq('fk_owner_id', session!.user.ownerId);

    if (dbError) throw new Error(dbError.message);

    return NextResponse.json({ code: 1, message: 'Flight request deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
