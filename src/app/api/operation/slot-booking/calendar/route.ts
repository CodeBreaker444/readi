import { getWeekCalendar } from '@/backend/services/slot-booking/slot-calendar-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { SLOT_DATE_RE, todayIso } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const query = z.object({ start: z.string().regex(SLOT_DATE_RE, 'Use yyyy-MM-dd') });

/** Seven-day calendar of every slot with group, client, pilot, requests and weather. OPM only. */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = query.safeParse({ start: request.nextUrl.searchParams.get('start') ?? todayIso() });
    if (!parsed.success) return zodError(E.VL004, parsed.error);

    return NextResponse.json({ code: 1, data: await getWeekCalendar(session!.user, parsed.data.start) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
