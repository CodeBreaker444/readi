import { getMissionTypeList } from '@/backend/services/mission/missionType';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const ownerId = session.user.ownerId;
    const result = await getMissionTypeList(ownerId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}