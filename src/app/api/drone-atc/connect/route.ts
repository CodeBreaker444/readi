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

    // Try to get multiple organization credentials first
    const multiOrgCreds = await getAllUserFlytbaseCredentials(userId);
    
    if (multiOrgCreds.length > 0) {
      // User has multiple organizations assigned
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
    }

    // Fallback to single organization (legacy behavior)
    const creds = await getFlytbaseCredentials(userId);
    if (!creds) return NextResponse.json({ hasFlytbaseKey: false });

    const conn = await connectToFlytrelay(String(userId), creds.token, creds.orgId, fleetCompanyId);

    return NextResponse.json({
      hasFlytbaseKey: true,
      wsUrl: conn.wsUrl,
      topic: conn.topic,
      token: conn.token,
      multipleOrgs: false,
    });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
