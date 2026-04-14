import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteUser } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users')
      if (error) return error

    const body = await request.json();
    const isSuperAdmin = session!.user.role === 'SUPERADMIN';

    await deleteUser(body.user_id, session!.user.ownerId, isSuperAdmin);

    logEvent({
      eventType: 'DELETE',
      entityType: 'user',
      entityId: body.user_id,
      description: `Deleted user ID ${body.user_id}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'User deleted successfully',
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}