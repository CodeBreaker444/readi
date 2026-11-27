import { FlightRequestLinkError, listLinkableMissions } from '@/backend/services/mission/flight-request-mission-service';
import { apiError, internalError } from '@/lib/api-error';
import { requireFeatureView } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requireFeatureView('operation_flight_requests');
    if (error) return error;

    const id = Number((await props.params).id);
    if (!Number.isInteger(id) || id <= 0) return apiError(E.VL001, 400);

    const items = await listLinkableMissions(id, session!.user.ownerId);
    return NextResponse.json({ code: 1, items });
  } catch (err) {
    if (err instanceof FlightRequestLinkError) {
      return NextResponse.json({ code: 0, error: err.message }, { status: err.status });
    }
    return internalError(E.SV001, err);
  }
}
