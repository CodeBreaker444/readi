import { fetchFlytrelayFlights } from '@/backend/services/integrations/flytrelay-flights-service';
import { getAllUserFlytbaseCredentials, getOrganizationCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const droneId = req.nextUrl.searchParams.get('droneId') || undefined;
    const pageParam = req.nextUrl.searchParams.get('page');
    const organizationIdParam = req.nextUrl.searchParams.get('organizationId');
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const pageSize = 8;

    let organizations;

    if (organizationIdParam) {
      const organizationId = parseInt(organizationIdParam, 10);
      if (isNaN(organizationId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid organization ID' },
          { status: 400 },
        );
      }
      const orgCreds = await getOrganizationCredentials(organizationId);
      if (!orgCreds) {
        return NextResponse.json(
          { success: false, message: 'Organization not found or has no credentials' },
          { status: 404 },
        );
      }
      organizations = [{ orgId: orgCreds.orgId, token: orgCreds.token }];
    } else {
      // Get organizations assigned to user from user_flytbase_access table
      const multiOrgCreds = await getAllUserFlytbaseCredentials(session!.user.userId);
      // If no organizations assigned, return empty flights
      if (multiOrgCreds.length === 0) {
        return NextResponse.json({ success: true, flights: [], total: 0, page, pageSize });
      }
      organizations = multiOrgCreds.map(cred => ({
        orgId: cred.orgId,
        token: cred.token,
      }));
    }

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
