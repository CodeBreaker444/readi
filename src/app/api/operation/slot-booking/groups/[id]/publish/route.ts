import { publishGroupNow } from '@/backend/services/slot-booking/slot-booking-service';
import { apiError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { parseRouteId, slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Opens a scheduled slot group to pilots right away (OPM only). */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const groupId = parseRouteId((await params).id);
    if (!groupId) return apiError(E.VL002);

    await publishGroupNow(session!.user, groupId);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
