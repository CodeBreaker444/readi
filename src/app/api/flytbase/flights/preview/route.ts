import {
  fetchFlightGutmaPreview,
  getFlytbaseCredentials,
} from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// GUTMA download + ZIP extraction can take 20–40 s for large flights
export const maxDuration = 60;

const schema = z.object({
  flightId: z.string().min(1).max(256),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const creds = await getFlytbaseCredentials(session!.user.userId);
    if (!creds) {
      return NextResponse.json(
        { success: false, message: 'No FlytBase integration configured.' },
        { status: 422 },
      );
    }

    const preview = await fetchFlightGutmaPreview(
      creds.token,
      creds.orgId,
      parsed.data.flightId,
    );

    return NextResponse.json({ success: true, preview });
  } catch (err: any) {
    console.error('[POST /api/integrations/flytbase/flights/preview]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
