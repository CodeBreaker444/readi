import { deletePilotGroup, updatePilotGroup } from '@/backend/services/slot-booking/pilot-group-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { pilotGroupSchema } from '@/lib/pilot-group-validation';
import { slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

const parseId = async (params: Params['params']) => {
  const raw = (await params).id;
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const id = await parseId(params);
    if (!id) return apiError(E.VL002);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(E.VL001);
    }
    const parsed = pilotGroupSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    return NextResponse.json({ code: 1, data: await updatePilotGroup(session!.user, id, parsed.data) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const id = await parseId(params);
    if (!id) return apiError(E.VL002);

    await deletePilotGroup(session!.user, id);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
