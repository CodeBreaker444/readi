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

    const items = await res.json();

    return NextResponse.json({
      items: Array.isArray(items) ? items : [],
      role,
      companyId: ownerId,
    });
  } catch (err) {
    console.error('[GET /api/drone-atc/fleet]', err);
    return internalError(E.SV001, err);
  }
}
