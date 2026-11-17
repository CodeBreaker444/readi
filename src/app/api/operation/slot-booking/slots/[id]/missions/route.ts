import { getSlotMissionCandidates, linkSlotMissions, unlinkSlotMission } from '@/backend/services/slot-booking/slot-today-service';
import { apiError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { parseRouteId, slotBookingErrorResponse } from '@/lib/slot-booking-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const linkSchema = z.object({ missionIds: z.array(z.number().int().positive()).min(1).max(50) });

/** Missions of the slot's pilot that can be linked to the slot (the slot's pilot or the OPM). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = parseRouteId((await params).id);
    if (!slotId) return apiError(E.VL002);

    return NextResponse.json({ code: 1, data: await getSlotMissionCandidates(session!.user, slotId) });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

/** Links missions to the slot. A mission can be linked to one slot only. */
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
    const parsed = linkSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await linkSlotMissions(session!.user, slotId, parsed.data.missionIds);
    return NextResponse.json({ code: 1, data }, { status: 201 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}

/** Unlinks one mission (`?missionId=`) from the slot. */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const slotId = parseRouteId((await params).id);
    const missionId = parseRouteId(request.nextUrl.searchParams.get('missionId') ?? '');
    if (!slotId || !missionId) return apiError(E.VL002);

    await unlinkSlotMission(session!.user, slotId, missionId);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return slotBookingErrorResponse(err);
  }
}
