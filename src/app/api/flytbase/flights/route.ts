import {
  fetchLatestFlights,
  fetchRecentFlights,
  getFlytbaseCredentials,
  getFlytbaseCredentialsForCompany,
} from '@/backend/services/integrations/flytbase-service';
import {
  getOrganizationCredentials,
  getUserFlytbaseCredentials,
} from '@/backend/services/integrations/flytbase-organization-service';
import { getFlightIdsLinkedToMission } from '@/backend/services/operation/mission-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

async function withMissionLinkFlags<T extends { flight_id: string }>(
  flights: T[],
  ownerId: number,
): Promise<(T & { linked_to_mission: boolean })[]> {
  const linkedIds = await getFlightIdsLinkedToMission(flights.map((f) => f.flight_id), ownerId);
  return flights.map((f) => ({ ...f, linked_to_mission: linkedIds.has(f.flight_id) }));
}

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    // Check if organizationId is provided (new system)
    const organizationIdParam = req.nextUrl.searchParams.get('organizationId');
    let creds;

    if (organizationIdParam) {
      // Use organization-based credentials
      const organizationId = parseInt(organizationIdParam, 10);
      if (isNaN(organizationId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid organization ID' },
          { status: 400 },
        );
      }
      creds = await getOrganizationCredentials(organizationId);
      if (!creds) {
        return NextResponse.json(
          { success: false, message: 'Organization not found or has no credentials' },
          { status: 404 },
        );
      }
    } else {
      // Fallback to old user-based credentials for backward compatibility
      creds =
        (await getFlytbaseCredentials(session!.user.userId)) ??
        (await getFlytbaseCredentialsForCompany(session!.user.ownerId, session!.user.userId));
      if (!creds) {
        // Try new organization-based system as fallback
        const orgCreds = await getUserFlytbaseCredentials(session!.user.userId);
        if (orgCreds) {
          creds = { token: orgCreds.token, orgId: orgCreds.orgId };
        } else {
          return NextResponse.json(
            { success: false, message: 'No FlytBase integration configured. Please contact your administrator to grant access to an organization.' },
            { status: 422 },
          );
        }
      }
    }

    const mode = req.nextUrl.searchParams.get('mode');
    const pageParam = req.nextUrl.searchParams.get('page');
    const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
    const pageSize = 8;

    if (mode === 'latest') {
      const { flights, total } = await fetchLatestFlights(creds.token, creds.orgId, page, pageSize);
      const flightsWithLinks = await withMissionLinkFlags(flights, session!.user.ownerId);
      return NextResponse.json({ success: true, flights: flightsWithLinks, total, mode: 'latest', page, pageSize });
    }

    const windowParam = req.nextUrl.searchParams.get('window');
    const windowMinutes = Math.min(
      Math.max(1, parseInt(windowParam ?? '1440', 10) || 1440),
      1440,
    );

    const { flights, total } = await fetchRecentFlights(creds.token, creds.orgId, windowMinutes, page, pageSize);
    const flightsWithLinks = await withMissionLinkFlags(flights, session!.user.ownerId);
    return NextResponse.json({ success: true, flights: flightsWithLinks, total, windowMinutes, page, pageSize });
  } catch (err: any) {
    console.error('[GET /api/integrations/flytbase/flights]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
