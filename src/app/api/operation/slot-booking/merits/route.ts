import { getMerits } from '@/backend/services/slot-booking/pilot-stats-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

/** Pilot merit table: hours, availability (weekends weigh most) and score. OPM only. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await getMerits(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
