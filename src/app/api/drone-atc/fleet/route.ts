import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { getAllUserFlytbaseCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { signReadiDroneJwt, signReadiDroneJwtWithMultipleOrgs } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { userId, role, ownerId } = session!.user;

    const fleetCompanyId =
      role === 'SUPERADMIN' ? '0' :
      role === 'ADMIN' ? String(ownerId) :
      undefined;

    // Get organizations assigned to user from user_flytbase_access table
    const multiOrgCreds = await getAllUserFlytbaseCredentials(userId);
    
    const baseUrl = env.FLYTRELAY_BASE_URL;
    if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

    // If no organizations assigned, return empty fleet
    if (multiOrgCreds.length === 0) {
      return NextResponse.json({ items: [], role, companyId: ownerId });
    }

    // User has organizations assigned - use them
    const organizations = multiOrgCreds.map(cred => ({
      orgId: cred.orgId,
      token: cred.token,
    }));
    const jwt = signReadiDroneJwtWithMultipleOrgs(String(userId), organizations, fleetCompanyId);

    const res = await fetch(`${baseUrl}/api/fleet/overview`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('[fleet/overview] FlytRelay error:', res.status, body);
      return NextResponse.json({ items: [], role, companyId: ownerId });
    }

    const data = await res.json();

    type GroupedEntry = { pilot_name?: string; pilot_email?: string; drones?: Record<string, unknown>[] };
    const grouped: GroupedEntry[] = Array.isArray(data.grouped) ? data.grouped : [];

    let items: Record<string, unknown>[];

    if (grouped.length > 0) {
      items = grouped.flatMap((group) =>
        (group.drones ?? []).map((drone) => ({
          ...drone,
          drone_id: drone.flytbase_id ?? drone.drone_id,
          name: drone.tool_name ?? drone.name,
          model: drone.tool_name ?? drone.model,
          pilot_name: group.pilot_name,
          pilot_email: group.pilot_email,
        }))
      );
    } else {
      const rawItems: Record<string, unknown>[] = Array.isArray(data.drones) ? data.drones : [];
      items = rawItems.map((drone) => ({
        ...drone,
        drone_id: drone.flytbase_id ?? drone.drone_id,
        name: drone.tool_name ?? drone.name,
        model: drone.tool_name ?? drone.model,
      }));
    }

    return NextResponse.json({ items, role, companyId: ownerId });
  } catch (err) {
    console.error('[GET /api/drone-atc/fleet]', err);
    return internalError(E.SV001, err);
  }
}
