import { ClientScheduledFlightsError, getClientScheduledFlights } from '@/backend/services/client/client-scheduled-flights-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { SLOT_DATE_RE, todayIso } from '@/lib/slot-booking-utils';
import { NextRequest, NextResponse } from 'next/server';

/** Client portal: approved slots (with pilot) of one day for the signed-in client. `date` is yyyy-MM-dd, default today. */
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;
    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const date = req.nextUrl.searchParams.get('date') || todayIso();
    if (!SLOT_DATE_RE.test(date)) {
      return NextResponse.json({ error: 'Invalid date, use yyyy-MM-dd' }, { status: 400 });
    }

    return NextResponse.json({ data: await getClientScheduledFlights(clientId, ownerId, date) });
  } catch (err) {
    if (err instanceof ClientScheduledFlightsError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return internalError(E.SV001, err);
  }
}
