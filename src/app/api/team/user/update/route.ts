import { updateUser } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users')
    if (error) return error

    const user = session!.user;
    const body = await request.json();

    const result = await updateUser({
      user_id: body.user_id,
      owner_id: body.owner_id || user.ownerId,
      fullname: body.fullname,
      email: body.email,
      user_phone: body.user_phone || body.phone,
      fk_user_profile_id: body.profile_id || body.fk_user_profile_id,
      fk_territorial_unit: body.territorial_id || body.fk_territorial_unit,
      fk_client_id: body.fk_client_id,
      user_type: body.user_type,
      active: body.active,
      is_viewer: body.is_viewer || body.user_viewer,
      is_manager: body.is_manager || body.user_manager,
      user_image: body.user_image,
      user_signature: body.user_signature,
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'User updated successfully',
      param: body,
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