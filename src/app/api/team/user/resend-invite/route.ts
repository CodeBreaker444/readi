import { resendUserInvite } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await request.json();
    const userId = Number(body.user_id);

    if (!userId || userId <= 0) {
      return NextResponse.json({ code: 0, message: 'Invalid user ID' }, { status: 400 });
    }

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const ownerId = session!.user.ownerId;
    const result = await resendUserInvite(userId, ownerId, isSuperAdmin);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: result.message,
      emailSent: result.emailSent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resend invite';
    if (msg === 'User is already activated') {
      return NextResponse.json({ code: 0, message: msg }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
