import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const flightId = req.nextUrl.searchParams.get('flightId');
  if (!flightId) {
    return NextResponse.json({ success: false, message: 'flightId is required' }, { status: 400 });
  }

  const creds = await getFlytbaseCredentials(session!.user.userId);
  if (!creds) {
    return NextResponse.json(
      { success: false, message: 'No FlytBase integration configured.' },
      { status: 422 },
    );
  }
  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;

  const upstream = await fetch(gutmaUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'org-id': creds.orgId,
    },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { success: false, message: `FlytBase returned ${upstream.status}` },
      { status: upstream.status },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Cache-Control': 'no-store',
    },
  });
}
