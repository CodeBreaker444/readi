import {
  fetchLatestFlights,
  fetchRecentFlights,
  getFlytbaseCredentials,
  getFlytbaseCredentialsForCompany,
} from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const creds =
      (await getFlytbaseCredentials(session!.user.userId)) ??
      (await getFlytbaseCredentialsForCompany(session!.user.ownerId, session!.user.userId));
    if (!creds) {
      return NextResponse.json(
        { success: false, message: 'No FlytBase integration configured. Please add your API token first.' },
        { status: 422 },
      );
    }

    const mode = req.nextUrl.searchParams.get('mode');
    const pageParam = req.nextUrl.searchParams.get('page');
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const pageSize = 20;

    if (mode === 'latest') {
      const { flights, total } = await fetchLatestFlights(creds.token, creds.orgId, page, pageSize);
      return NextResponse.json({ success: true, flights, total, mode: 'latest', page, pageSize });
    }

    const windowParam = req.nextUrl.searchParams.get('window');
    const windowMinutes = Math.min(
      Math.max(1, parseInt(windowParam ?? '1440', 10) || 1440),
      1440,
    );

    const { flights, total } = await fetchRecentFlights(creds.token, creds.orgId, windowMinutes, page, pageSize);
    return NextResponse.json({ success: true, flights, total, windowMinutes, page, pageSize });
  } catch (err: any) {
    console.error('[GET /api/integrations/flytbase/flights]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
