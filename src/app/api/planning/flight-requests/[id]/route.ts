import { deleteFlightRequest, updateFlightRequestStatus, verifyFlightRequestOwnership } from '@/backend/services/mission/flight-request-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PatchSchema = z.object({
  dcc_status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ISSUE', 'CANCELLED']),
});

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('operation_flight_requests', 'edit');
    if (featureError) return featureError;

    const id = Number(params.id);
    if (isNaN(id) || id <= 0) return apiError(E.VL001, 400);

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const exists = await verifyFlightRequestOwnership(id, session!.user.ownerId);
    if (!exists) return apiError(E.NF021, 404);

    await updateFlightRequestStatus(id, session!.user.ownerId, parsed.data.dcc_status);

    return NextResponse.json({ code: 1, message: 'Flight request status updated' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('operation_flight_requests', 'delete');
    if (featureError) return featureError;

    const id = Number(params.id);
    if (isNaN(id) || id <= 0) return apiError(E.VL001, 400);

    const exists = await verifyFlightRequestOwnership(id, session!.user.ownerId);
    if (!exists) return apiError(E.NF021, 404);

    await deleteFlightRequest(id, session!.user.ownerId);

    return NextResponse.json({ code: 1, message: 'Flight request deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}