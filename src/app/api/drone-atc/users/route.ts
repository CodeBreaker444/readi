import { getUsersWithDroneAtc } from '@/backend/services/drone-atc/drone-atc-users-service';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { updateFlytrelayUsers } from '@/lib/flytrelay.service';
import { NextRequest, NextResponse } from 'next/server';
 
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = verifyFlytrelayJwt(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const users = await getUsersWithDroneAtc();

    return NextResponse.json({
      ok: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('[GET /api/drone-atc/users]', err);
    return internalError(E.SV001, err);
  }
}

export async function PATCH() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session!.user.userId;

    const creds = await getFlytbaseCredentials(userId);
    if (!creds) {
      return NextResponse.json({ error: 'No FlytBase credentials configured' }, { status: 404 });
    }

    const users = await getUsersWithDroneAtc();
    const result = await updateFlytrelayUsers(String(userId), creds.token, creds.orgId, users);

    return NextResponse.json({ ok: true, synced: result.synced });
  } catch (err) {
    console.error('[PATCH /api/drone-atc/users]', err);
    return internalError(E.SV001, err);
  }
}
