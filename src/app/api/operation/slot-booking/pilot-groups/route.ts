import { createPilotGroup, listPilotGroups } from '@/backend/services/slot-booking/pilot-group-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { pilotGroupSchema } from '@/lib/pilot-group-validation';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    return NextResponse.json({ code: 1, data: await listPilotGroups(session!.user) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(E.VL001);
    }
    const parsed = pilotGroupSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await createPilotGroup(session!.user, parsed.data);
    return NextResponse.json({ code: 1, data }, { status: 201 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
