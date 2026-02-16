import { createUser } from '@/backend/services/user/user-management';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session || session.user.role != 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const userData = {
      username: body.username,
      fullname: body.fullname,
      email: body.email,
      phone: body.phone,
      fk_user_profile_id: parseInt(body.profile || body.profile_id || body.fk_user_profile_id),
      user_type: body.user_type,
      is_viewer: body.user_viewer || body.is_viewer,
      is_manager: body.user_manager || body.is_manager,
      timezone: body.timezone,
      fk_client_id: parseInt(body.fk_client_id || 0),
      fk_territorial_unit: parseInt(body.ownerTerritorialUnit || body.territorial_id || 0),
      owner_id: session.user.ownerId,
    };

    const result = await createUser(userData);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'success',
      title: 'userDataAdd',
      timestamp: Math.floor(Date.now() / 1000),
      newId: result.userId,
      new_user_owner_id: result.userOwnerId,
      send_mail_to_new_user: result.emailSent,
      x_api_token: result.activationKey,
      error_list: [],
      param: body,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        code: 0,
        status: 'ERROR',
        message: 'ERROR',
        title: 'userDataAdd',
        timestamp: Math.floor(Date.now() / 1000),
        error_list: [error instanceof Error ? error.message : 'Internal server error'],
      },
      { status: 500 }
    );
  }
}