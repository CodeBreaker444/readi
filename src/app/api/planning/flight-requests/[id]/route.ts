import { getFlightRequestById, updateFlightRequestStatus, deleteFlightRequest, verifyFlightRequestOwnership } from '@/backend/services/mission/flight-request-service';
import { notifyDccDenial, notifyDccExecutionForRequest, notifyDccTerminationForRequest } from '@/backend/services/mission/dcc-callback-service';
import type { DccCallbackResult } from '@/types/dcc-callback';
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

    const ownerId = session!.user.ownerId;
    const fr = await getFlightRequestById(id, ownerId);
    if (!fr) return apiError(E.NF021, 404);

    await updateFlightRequestStatus(id, ownerId, parsed.data.dcc_status);

    let dcc: DccCallbackResult | undefined;
    if (fr.external_mission_id) {
      if (parsed.data.dcc_status === 'IN_PROGRESS') {
        dcc = await notifyDccExecutionForRequest(ownerId, fr.external_mission_id);
      } else if (parsed.data.dcc_status === 'COMPLETED') {
        dcc = await notifyDccTerminationForRequest(ownerId, fr.external_mission_id, 1);
      } else if (parsed.data.dcc_status === 'ISSUE') {
        dcc = await notifyDccDenial(ownerId, fr.external_mission_id);
      }
    }

    return NextResponse.json({ code: 1, message: 'Flight request status updated', dcc });
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