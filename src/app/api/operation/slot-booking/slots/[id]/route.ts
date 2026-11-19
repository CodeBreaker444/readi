import { editSlot } from '@/backend/services/slot-booking/slot-booking-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { SLOT_TIME_RE } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({
  start: z.string().regex(SLOT_TIME_RE),
  end: z.string().regex(SLOT_TIME_RE),
  active: z.boolean(),
  reason: z.string().trim().min(1).max(500),
});

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = Number((await params).id);
    if (!Number.isInteger(slotId)) return apiError(E.VL002);

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const { reason, ...patch } = parsed.data;
    await editSlot(session!.user, slotId, patch, reason);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
