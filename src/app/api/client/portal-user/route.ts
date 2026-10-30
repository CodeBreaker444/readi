import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updatePortalUser } from '@/backend/services/client/client-service';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  client_id: z.number().int().positive('Client ID is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(100)
    .regex(/^[a-z0-9_.@+-]+$/, 'Username can only contain lowercase letters, numbers, and . _ @ + -').optional(),
  email: z.string().email('Invalid email').max(255).optional(),
  reset_password: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) return unauthorized(E.AU001);

    const { error: featureError } = await requireFeatureAccess('team_client', 'edit');
    if (featureError) return featureError;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const result = await updatePortalUser({
      ...parsed.data,
      ownerId: session.user.ownerId,
      isSuperAdmin: session.user.role === 'SUPERADMIN',
    });

    if (result.code === 1 && result.changes?.length) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'client',
        entityId: parsed.data.client_id,
        description: `Portal user updated for ${result.email} (${result.changes.join(', ')})`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId: session.user.ownerId,
      });
    }

    return NextResponse.json(result, { status: result.code === 1 ? 200 : 400 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
