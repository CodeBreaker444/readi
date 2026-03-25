import { getMissionTypeList } from '@/backend/services/mission/mission-type';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    const ownerId = session!.user.ownerId;
    const result = await getMissionTypeList(ownerId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}