import { createPdfUploadUrl } from '@/backend/services/slot-booking/slot-booking-service';
import { zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  file_name: z.string().min(1).max(255),
  content_type: z.string().min(1),
  file_size: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await createPdfUploadUrl(session!.user, parsed.data);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
