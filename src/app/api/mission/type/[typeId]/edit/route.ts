import { updateMissionType } from '@/backend/services/mission/mission-type';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> } 
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
    const { typeId } = await params; 
    const body = await request.json();
    
    const result = await updateMissionType(ownerId, Number(typeId), body.data);
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}