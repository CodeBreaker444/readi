import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { connectToFlytrelay } from '@/lib/flytrelay-service';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { userId, role, ownerId } = session!.user;

    const fleetCompanyId =
      role === 'SUPERADMIN' ? '0' :
      role === 'ADMIN' ? String(ownerId) :
      undefined;

    const creds = await getFlytbaseCredentials(userId);
    if (!creds) return NextResponse.json({ hasFlytbaseKey: false });

    const conn = await connectToFlytrelay(String(userId), creds.token, creds.orgId, fleetCompanyId);

    return NextResponse.json({
      hasFlytbaseKey: true,
      wsUrl: conn.wsUrl,
      topic: conn.topic,
      token: conn.token,
    });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
