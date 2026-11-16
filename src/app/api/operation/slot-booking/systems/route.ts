import { listSystems } from '@/backend/services/slot-booking/slot-booking-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

/** Active systems that belong to a client (OPM only), for the system choice of a slot group. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await listSystems(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
