import { getDocumentUrl } from '@/backend/services/slot-booking/slot-booking-service';
import { apiError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const bookingId = Number((await params).id);
    if (!Number.isInteger(bookingId)) return apiError(E.VL002);

    const data = await getDocumentUrl(session!.user, bookingId);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
