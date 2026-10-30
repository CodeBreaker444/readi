import { logEvent } from '@/backend/services/auditLog/audit-log';
import { activateClientUser } from '@/backend/services/client/client-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  client_id: z.number().int().positive('Client ID is required'),
  client_name: z.string().max(255),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_client');
    if (error) return error;

    const role = session!.user.role;
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ code: 0, message: 'Only an admin can activate a client account' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const result = await activateClientUser(parsed.data.client_id, session!.user.ownerId, isSuperAdmin);

    if (result.code === 1) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'client',
        entityId: parsed.data.client_id,
        description: `Client account manually activated by admin (${parsed.data.client_name})`,
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
