import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateUserPassword } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  user_id: z.number().int().positive('User ID is required'),
  new_password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    email: z.string()
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const result = await updateUserPassword(
      parsed.data.user_id,
      session!.user.ownerId,
      parsed.data.new_password,
      isSuperAdmin,
    );

    logEvent({
      eventType: 'UPDATE',
      entityType: 'user',
      entityId: parsed.data.user_id,
      description: `Password updated for user (${parsed.data.email})`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ code: 1, status: 'SUCCESS', message: result.message });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update password';
    if (msg === 'User not found') {
      return NextResponse.json({ code: 0, message: msg }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
