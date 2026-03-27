import {
  fetchRecentFlights,
  getFlytbaseCredentials,
} from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

 
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const windowParam = req.nextUrl.searchParams.get('window');
    const windowMinutes = Math.min(
      Math.max(1, parseInt(windowParam ?? '30', 10) || 30),
      1440,
    );

    const creds = await getFlytbaseCredentials(session!.user.userId);
    if (!creds) {
      return NextResponse.json(
        { success: false, message: 'No FlytBase integration configured. Please add your API token first.' },
        { status: 422 },
      );
    }

    const { flights, total } = await fetchRecentFlights(
      creds.token,
      creds.orgId,
      windowMinutes,
    );

    return NextResponse.json({ success: true, flights, total, windowMinutes });
  } catch (err: any) {
    console.error('[GET /api/integrations/flytbase/flights]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
