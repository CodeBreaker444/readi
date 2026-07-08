import { getUsersWithDroneAtc } from '@/backend/services/drone-atc/drone-atc-users-service';
import { getUserFlytbaseOrganizations } from '@/backend/services/integrations/flytbase-organization-service';
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
    const companyId = session!.user.ownerId;

    if (!companyId) {
      return NextResponse.json({ error: 'User has no company assigned' }, { status: 400 });
    }

    const multiOrgCreds = await getAllUserFlytbaseCredentials(userId);

    if (multiOrgCreds.length === 0) {
      return NextResponse.json({ error: 'No FlytBase organizations assigned to user' }, { status: 404 });
    }

    const users = await getUsersWithDroneAtc(companyId);

    const flytrelayUsers = users.map(({ systems, organizations, ...user }) => ({
      ...user,
      organizations,
      systems: systems.map(({ components, ...system }) => ({
        ...system,
        components: components.map(({ dccDroneId, ...comp }) => ({ ...comp, drone_id: dccDroneId })),
      })),
    }));

    // Try multi-org first, fall back to per-org calls if it fails
    let synced = 0;
    try {
      const organizations = multiOrgCreds.map(cred => ({
        orgId: cred.orgId,
        token: cred.token,
      }));
      const result = await updateFlytrelayUsersWithMultipleOrgs(String(userId), organizations, flytrelayUsers, String(companyId));
      synced = result.synced;
    } catch (multiOrgError: any) {
      console.warn('[PATCH /api/drone-atc/users] Multi-org update failed, trying per-org:', multiOrgError.message);
      
      // Fall back to calling single-org version for each organization
      for (const cred of multiOrgCreds) {
        try {
          const result = await updateFlytrelayUsers(String(userId), cred.token, cred.orgId, flytrelayUsers);
          synced += result.synced;
        } catch (orgError: any) {
          console.error(`[PATCH /api/drone-atc/users] Failed for org ${cred.orgId}:`, orgError.message);
        }
      }
    }

    return NextResponse.json({ ok: true, synced });
  } catch (err) {
    console.error('[PATCH /api/drone-atc/users]', err);
    return internalError(E.SV001, err);
  }
}