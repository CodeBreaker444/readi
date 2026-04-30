import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { apiError } from '@/lib/api-error';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

/**
 * This endpoint is used by FlytRelay when it can’t find a userId in its Redis cache.
 * FlytRelay calls it server-to-server using an RS256 JWT signed with its private key.
 * We verify that token using the FlytRelay public key, and if valid,
 * return the corresponding user’s FlytBase credentials.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing authorization' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const payload = verifyFlytrelayJwt(token);
  if (!payload) {
   return apiError(E.AU010, 401);
  }

  const userId = Number(payload.userId);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const creds = await getFlytbaseCredentials(userId);
  if (!creds) {
    return NextResponse.json({ error: 'User has no FlytBase credentials' }, { status: 404 });
  }

  return NextResponse.json({
    userId: String(userId),
    flytbaseApiToken: creds.token,
    flytbaseOrgId: creds.orgId,
  });
}
