import { createClientPortalFlightRequest } from '@/backend/services/client/client-portal-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;
    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { mission_type, target, start_datetime, priority, notes, operator, localization, waypoint } = body;

    if (!mission_type && !target) {
      return NextResponse.json({ error: 'Mission type or target is required' }, { status: 400 });
    }

    const result = await createClientPortalFlightRequest({
      owner_id: ownerId,
      client_id: clientId,
      mission_type,
      target,
      start_datetime,
      priority,
      notes,
      operator,
      localization,
      waypoint,
    });

    return NextResponse.json({ code: 1, request_id: result.request_id });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
