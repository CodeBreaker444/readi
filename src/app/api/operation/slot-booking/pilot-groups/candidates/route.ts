import { listCandidates } from '@/backend/services/slot-booking/pilot-group-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

/** Active users of the caller's company who can be added to a pilot group. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await listCandidates(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
