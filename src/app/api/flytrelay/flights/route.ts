import { fetchFlytrelayFlights } from '@/backend/services/integrations/flytrelay-flights-service';
import { getAllUserFlytbaseCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const droneId = req.nextUrl.searchParams.get('droneId') || undefined;
    const pageParam = req.nextUrl.searchParams.get('page');
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const pageSize = 20;

    // Try to get multiple organization credentials first
    const multiOrgCreds = await getAllUserFlytbaseCredentials(session!.user.userId);
    const organizations = multiOrgCreds.length > 0 ? multiOrgCreds.map(cred => ({
      orgId: cred.orgId,
      token: cred.token,
    })) : undefined;

    const { flights, total } = await fetchFlytrelayFlights(
      String(session!.user.userId),
      session!.user.ownerId ? String(session!.user.ownerId) : undefined,
      droneId,
      page,
      pageSize,
      organizations,
    );
      // console.log('fetched flights:', flights);
    return NextResponse.json({ success: true, flights, total, page, pageSize });
  } catch (err: any) {
    console.error('[GET /api/flytrelay/flights]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
