import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { signReadiDroneJwt } from '@/lib/drone-atc-jwt';
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

    const creds = await getFlytbaseCredentials(userId);
    if (!creds) {
      return NextResponse.json({ items: [], role, companyId: ownerId });
    }

    const baseUrl = env.FLYTRELAY_BASE_URL;
    if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

    const jwt = signReadiDroneJwt(String(userId), creds.token, creds.orgId, fleetCompanyId);

    const res = await fetch(`${baseUrl}/api/fleet/overview`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      const body = await res.text();
      console.warn('[fleet/overview] FlytRelay error:', res.status, body);
      return NextResponse.json({ items: [], role, companyId: ownerId });
    }

    const data = await res.json();
    console.log('[fleet/overview] raw:', JSON.stringify(data).slice(0, 500));
console.log('res:',data);

    const rawItems: Record<string, unknown>[] = Array.isArray(data.drones) ? data.drones : [];

    const items = rawItems.map((item) => ({
      ...item,
      drone_id: item.flytbase_id ?? item.drone_id,
      name: item.tool_name ?? item.name,
      model: item.tool_name ?? item.model,
    }));

    return NextResponse.json({ items, role, companyId: ownerId });
  } catch (err) {
    console.error('[GET /api/drone-atc/fleet]', err);
    return internalError(E.SV001, err);
  }
}
