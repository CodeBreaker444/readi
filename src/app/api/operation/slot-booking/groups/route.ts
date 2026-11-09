import { createGroup } from '@/backend/services/slot-booking/slot-booking-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { SLOT_DATE_RE, SLOT_TIME_RE } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).optional(),
  mode: z.enum(['HOURLY', 'SHIFT']),
  hourStart: z.number().int().min(0).max(23),
  hourEnd: z.number().int().min(1).max(24),
  rangeMode: z.enum(['DAY', 'WEEK', 'TWO_WEEKS']),
  startDate: z.string().regex(SLOT_DATE_RE),
  blocked: z.boolean(),
  approvalDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  slots: z
    .array(z.object({ date: z.string().regex(SLOT_DATE_RE), start: z.string().regex(SLOT_TIME_RE), end: z.string().regex(SLOT_TIME_RE) }))
    .min(1)
    .max(500),
  resolution: z.enum(['none', 'merge', 'overwrite']),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await createGroup(session!.user, parsed.data);
    return NextResponse.json({ code: 1, data }, { status: 201 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
