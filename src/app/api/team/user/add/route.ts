import { logEvent } from '@/backend/services/auditLog/audit-log';
import { createUser } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
   const { session, error } = await requirePermission('manage_users')
     if (error) return error

    const body = await request.json();

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';

    if (isSuperAdmin && !body.owner_id) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'A company must be assigned when creating a user as Super Admin', error_list: ['owner_id is required'] },
        { status: 400 },
      );
    }

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
      owner_id: isSuperAdmin ? parseInt(body.owner_id) : session!.user.ownerId,
    };

    const result = await createUser(userData);

    logEvent({
      eventType: 'CREATE',
      entityType: 'user',
      entityId: result.userId,
      description: `Created user '${body.fullname ?? body.email}'`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
      metadata: { email: body.email, role: body.user_type },
    });

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
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.startsWith('PENDING_ACTIVATION:')) {
      const userId = msg.split(':')[1];
      return NextResponse.json(
        {
          code: 0,
          status: 'PENDING_ACTIVATION',
          message: 'This email belongs to a user who has not yet activated their account.',
          pending_user_id: Number(userId),
          error_list: ['A pending invitation already exists for this email. Use "Resend Invite" to send a new activation link.'],
        },
        { status: 409 },
      );
    }
    return internalError(E.SV001, err);
  }
}