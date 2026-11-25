import { listClientSystemZones } from '@/backend/services/system/system-service';
import { requireFeatureView } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

/** Zones of every system assigned to a client — overlaid on flight requests. */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFeatureView('operation_flight_requests');
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const clientId = Number(body?.clientId);
    if (!Number.isInteger(clientId) || clientId <= 0) return NextResponse.json({ code: 1, systems: [] });

    const systems = await listClientSystemZones(session!.user.ownerId, clientId);
    return NextResponse.json({ code: 1, systems });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
