import { getClientEventDetail } from '@/backend/services/logbook/event-logbook-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { apiError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Read-only details of one event of the signed-in client. */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;
    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const data = await getClientEventDetail(clientId, ownerId, eventId);
    return NextResponse.json({ code: 200, data });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
