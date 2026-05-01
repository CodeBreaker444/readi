import { getUsersWithDroneAtc } from '@/backend/services/drone-atc/drone-atc-users-service';
import { internalError } from '@/lib/api-error';
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
