import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { apiError } from '@/lib/api-error';
import { verifyFlytrelayJwt } from '@/lib/drone-atc-jwt';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

 
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
