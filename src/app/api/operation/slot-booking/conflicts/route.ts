import { findConflictDates } from '@/backend/services/slot-booking/slot-booking-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { SLOT_DATE_RE } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  dates: z.array(z.string().regex(SLOT_DATE_RE)).min(1).max(31),
  /** Only slot groups of this client count as duplicates (null = groups without a client). */
  clientId: z.number().int().positive().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const conflicts = await findConflictDates(session!.user.ownerId, parsed.data.dates, parsed.data.clientId ?? null);
    return NextResponse.json({ code: 1, data: { conflicts } });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
