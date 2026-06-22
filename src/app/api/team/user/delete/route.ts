import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteUser } from '@/backend/services/user/user-management';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, notFound, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DeleteUserSchema = z.object({
  user_id: z.number().int().positive('Invalid user ID'),
});

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const body = await request.json();
    const parsed = DeleteUserSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL014, parsed.error);

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const deleted = await deleteUser(parsed.data.user_id, session!.user.ownerId, isSuperAdmin);

    logEvent({
      eventType: 'DELETE',
      entityType: 'user',
      entityId: parsed.data.user_id,
      description: `Deleted user${deleted.fullName ? ` '${deleted.fullName}'` : ''}${deleted.email ? ` (${deleted.email})` : ` ID ${parsed.data.user_id}`}`,
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
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'User not found or does not belong to this organization') return notFound(E.NF001);
    return internalError(E.SV001, err);
  }
}
