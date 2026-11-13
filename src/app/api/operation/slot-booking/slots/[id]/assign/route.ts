import { assignPilot, unassignPilot } from '@/backend/services/slot-booking/slot-assignment-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { parseRouteId, slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const schema = z.object({ pilotId: z.number().int().positive() });

/** Assigns a pilot to the slot (OPM only). Refuses a pilot with an overlapping assignment. */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = parseRouteId((await params).id);
    if (!slotId) return apiError(E.VL002);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(E.VL001);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await assignPilot(session!.user, slotId, parsed.data.pilotId);
    return NextResponse.json({ code: 1, data }, { status: 201 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

/** Removes the assigned pilot from the slot (OPM only). */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = parseRouteId((await params).id);
    if (!slotId) return apiError(E.VL002);

    await unassignPilot(session!.user, slotId);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
