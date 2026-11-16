import { listClients } from '@/backend/services/slot-booking/slot-booking-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

/** Active clients of the company (OPM only), for the client choice of a slot group. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await listClients(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
