import { checkClientUsername } from '@/backend/services/client/client-service';
import { getUserSession } from '@/lib/auth/server-session';
import { unauthorized } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const session = await getUserSession();
  if (!session) return unauthorized(E.AU001);

  const username = req.nextUrl.searchParams.get('username')?.trim() ?? '';
  if (!username) {
    return NextResponse.json({ available: true, similar: [] });
  }

  const requestedOwnerId = req.nextUrl.searchParams.get('owner_id');
  const ownerId = session.user.role === 'SUPERADMIN' && requestedOwnerId
    ? parseInt(requestedOwnerId, 10)
    : session.user.ownerId;

  const result = await checkClientUsername(ownerId, username);
  return NextResponse.json(result);
}
