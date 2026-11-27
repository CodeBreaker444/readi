import { deleteFlightRequest, verifyFlightRequestOwnership } from '@/backend/services/mission/flight-request-service';
import { apiError, internalError } from '@/lib/api-error';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
 
export async function DELETE(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { session, error } = await requireFeatureAccess('operation_flight_requests', 'delete');
    if (error) return error;

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
