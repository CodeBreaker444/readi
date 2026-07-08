import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateClientPassword } from '@/backend/services/client/client-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  client_id: z.number().int().positive('Client ID is required'),
  new_password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    client_name: z.string()
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_client');
    if (error) return error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const result = await updateClientPassword(
      parsed.data.client_id,
      session!.user.ownerId,
      parsed.data.new_password,
      isSuperAdmin,
    );

    if (result.code === 1) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'client',
        entityId: parsed.data.client_id,
        description: `Password updated for client (${parsed.data.client_name})`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
      return NextResponse.json({ code: 1, message: result.message });
    }

    const status = result.error === 'Client is already activated' ? 400 : 404;
    return NextResponse.json({ code: 0, message: result.error }, { status });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
