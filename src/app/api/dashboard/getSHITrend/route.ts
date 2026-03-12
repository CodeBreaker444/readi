import { getSHITrend } from '@/backend/services/dashboard/dashboard';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const result = await getSHITrend({
      owner_id: session.user.ownerId,
      user_id: session.user.userId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
