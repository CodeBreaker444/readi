import { getSettings, saveSettings } from '@/backend/services/slot-booking/slot-booking-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z
  .object({
    mode: z.enum(['HOURLY', 'SHIFT']),
    hourStart: z.number().int().min(0).max(23),
    hourEnd: z.number().int().min(1).max(24),
    rangeMode: z.enum(['DAY', 'WEEK', 'TWO_WEEKS']),
    blocked: z.boolean(),
    approvalDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    modifyLockHours: z.union([z.literal(0), z.literal(24), z.literal(48)]),
    cycleStartDay: z.number().int().min(1).max(28),
  })
  .refine((v) => v.mode !== 'HOURLY' || v.hourEnd > v.hourStart, { message: 'End must be after start', path: ['hourEnd'] });

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await getSettings(session!.user.ownerId) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    return NextResponse.json({ code: 1, data: await saveSettings(session!.user, parsed.data) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
