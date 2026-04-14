import { getUserListByOwner } from '@/backend/services/user/user-management';
import { requireAnyPermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
   const { session, error } = await requireAnyPermission('manage_users', 'view_logs')
     if (error) return error

    const body = await request.json();
    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const ownerId = isSuperAdmin ? 0 : session!.user.ownerId;
    const currentUserId = session!.user.userId;
    const userProfileId = body.user_profile;

    const result = await getUserListByOwner(ownerId, userProfileId, currentUserId);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'success',
      dataRows: result.count,
      data: result.data,
      param: [{ owner_id: ownerId }],
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}