import { getUsersWithDroneAtc } from '@/backend/services/drone-atc/drone-atc-users-service';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { getAllUserFlytbaseCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { updateFlytrelayUsers, updateFlytrelayUsersWithMultipleOrgs } from '@/lib/flytrelay-service';
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

    // Get organizations assigned to user from user_flytbase_access table
    const multiOrgCreds = await getAllUserFlytbaseCredentials(userId);
    
    // If no organizations assigned, return error
    if (multiOrgCreds.length === 0) {
      return NextResponse.json({ error: 'No FlytBase organizations assigned to user' }, { status: 404 });
    }
    
    const users = await getUsersWithDroneAtc();
    const flytrelayUsers = users.map(({ systems, ...user }) => ({
      ...user,
      systems: systems.map(({ components, ...system }) => ({
        ...system,
        components: components.map(({ dccDroneId, ...comp }) => ({ ...comp, drone_id: dccDroneId })),
      })),
    }));

    // User has organizations assigned - use them
    const organizations = multiOrgCreds.map(cred => ({
      orgId: cred.orgId,
      token: cred.token,
    }));
    const result = await updateFlytrelayUsersWithMultipleOrgs(String(userId), organizations, flytrelayUsers);

    return NextResponse.json({ ok: true, synced: result.synced });
  } catch (err) {
    console.error('[PATCH /api/drone-atc/users]', err);
    return internalError(E.SV001, err);
  }
}
