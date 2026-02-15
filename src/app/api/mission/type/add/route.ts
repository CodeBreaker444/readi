import { addMissionType } from '@/backend/services/mission/missionType';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST( request: NextRequest ) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    const ownerId = session.user.ownerId;
    const body = await request.json();

    const result = await addMissionType(ownerId, {
      mission_type_name: body.mission_type_name,
      mission_type_desc: body.mission_type_desc,
      mission_type_code: body.mission_type_code,
      mission_type_label: body.mission_type_label,
      fk_owner_id: ownerId
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}