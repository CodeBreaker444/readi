import { forbidden, unauthorized } from '@/lib/api-error';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { getReleaseLogs } from '@/lib/releases';
import { NextResponse } from 'next/server';

export const GET = async () => {
  try {
    const session = await getUserSession();
    if (!session) return unauthorized(E.AU001);

    if (session.user.role !== 'SUPERADMIN') {
      return forbidden(E.PX004);
    }

    const logs = getReleaseLogs();
    return NextResponse.json({ code: 1, data: logs });
  } catch {
    return NextResponse.json({ code: 0, message: 'Failed to load release logs' }, { status: 500 });
  }
};
