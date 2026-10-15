import { listEventsForClient } from '@/backend/services/logbook/event-logbook-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  event_type: z.string().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});

/** Events reported for the signed-in client's own systems/missions. */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;
    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const data = await listEventsForClient(clientId, ownerId, parsed.data);
    return NextResponse.json({ code: 200, data });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
