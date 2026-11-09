import { listMyBookings } from '@/backend/services/slot-booking/slot-booking-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await listMyBookings(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
