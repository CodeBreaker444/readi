import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const droneId = req.nextUrl.searchParams.get('droneId');
    if (!droneId) {
      return NextResponse.json({ error: 'droneId required' }, { status: 400 });
    }

    const creds = await getFlytbaseCredentials(session!.user.userId);
    if (!creds) {
      return NextResponse.json({ hasCredentials: false });
    }

    const baseUrl = env.FLYTBASE_URL;
    const streamName = `${droneId}_52_0_0`;
    const apiUrl = `${baseUrl}/v2/video-streaming/details?deviceId=${encodeURIComponent(droneId)}&streamName=${encodeURIComponent(streamName)}`;

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'org-id': creds.orgId,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[stream] FlytBase streaming API error:', res.status, body);
      return NextResponse.json(
        { hasCredentials: true, error: `Streaming API error: ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    console.log('response:',data);
    
    return NextResponse.json({ hasCredentials: true, ...data });
  } catch (err) {
    console.error('[GET /api/drone-atc/stream]', err);
    return internalError(E.SV001, err);
  }
}
