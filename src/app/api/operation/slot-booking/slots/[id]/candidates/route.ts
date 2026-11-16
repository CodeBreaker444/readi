import { getSlotCandidates } from '@/backend/services/slot-booking/slot-assignment-service';
import { apiError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { parseRouteId, slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Pilots that can be assigned to the slot, with hours, score, requested flag and collisions. OPM only. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = parseRouteId((await params).id);
    if (!slotId) return apiError(E.VL002);

    return NextResponse.json({ code: 1, data: await getSlotCandidates(session!.user, slotId) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
