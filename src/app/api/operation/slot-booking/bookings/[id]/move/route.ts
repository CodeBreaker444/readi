import { moveBooking } from '@/backend/services/slot-booking/slot-booking-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { parseRouteId, slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ slotId: z.number().int().positive() });

/** A pilot moves their pending request to another slot of the same group (blocked inside the lock window). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const bookingId = parseRouteId((await params).id);
    if (!bookingId) return apiError(E.VL002);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(E.VL001);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    await moveBooking(session!.user, bookingId, parsed.data.slotId);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
