import { getTodayBoard } from '@/backend/services/slot-booking/slot-today-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Today tab: the signed-in pilot's approved slots of today with their linked missions and live mission progress. */
export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await getTodayBoard(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
