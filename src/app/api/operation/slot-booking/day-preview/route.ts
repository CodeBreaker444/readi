import { getDayPreview } from '@/backend/services/slot-booking/slot-assignment-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { SLOT_DATE_RE } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const query = z.object({ date: z.string().regex(SLOT_DATE_RE, 'Use yyyy-MM-dd') });

/** Operations day sheet: all slots of one day with client and assigned pilot. OPM only. */
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = query.safeParse({ date: request.nextUrl.searchParams.get('date') ?? '' });
    if (!parsed.success) return zodError(E.VL004, parsed.error);

    return NextResponse.json({ code: 1, data: await getDayPreview(session!.user, parsed.data.date) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
