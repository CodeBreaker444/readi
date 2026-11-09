import { rejectBooking } from '@/backend/services/slot-booking/slot-booking-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ note: z.string().trim().max(500).optional() });

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const bookingId = Number((await params).id);
    if (!Number.isInteger(bookingId)) return apiError(E.VL002);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    await rejectBooking(session!.user, bookingId, parsed.data.note);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
