import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { getAllUserFlytbaseCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { connectToFlytrelay, connectToFlytrelayWithMultipleOrgs } from '@/lib/flytrelay-service';
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

    // Get organizations assigned to user from user_flytbase_access table
    const multiOrgCreds = await getAllUserFlytbaseCredentials(userId);
    
    // If no organizations assigned, return no access
    if (multiOrgCreds.length === 0) {
      return NextResponse.json({ hasFlytbaseKey: false });
    }

    // User has organizations assigned - use them
    const organizations = multiOrgCreds.map(cred => ({
      orgId: cred.orgId,
      token: cred.token,
    }));
    console.log('jwt payload:',organizations);
    const conn = await connectToFlytrelayWithMultipleOrgs(String(userId), organizations, fleetCompanyId);

    return NextResponse.json({
      hasFlytbaseKey: true,
      wsUrl: conn.wsUrl,
      topic: conn.topic,
      token: conn.token,
      multipleOrgs: true,
      orgCount: organizations.length,
    });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
