import { getUserListByOwner } from '@/backend/services/user/user-management';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ownerId =  session.user.ownerId  
    const userProfileId = body.user_profile

    const result = await getUserListByOwner(ownerId, userProfileId);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'success',
      dataRows: result.count,
      data: result.data,
      param: [{ owner_id: ownerId, user_profile_id: userProfileId }],
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        code: 0,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}