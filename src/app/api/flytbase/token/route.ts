import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  hasFlytbaseToken,
  removeFlytbaseToken,
  saveFlytbaseConfig,
  verifyFlytbaseTokenAndGetUser,
} from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const saveSchema = z.object({
  token: z.string().min(8, 'Token too short').max(2048, 'Token too long'),
  orgId: z.string().min(4, 'Org ID too short').max(128, 'Org ID too long'),
});

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const exists = await hasFlytbaseToken(session!.user.userId);
    return NextResponse.json({ success: true, hasToken: exists });
  } catch (err) {
    console.error('[GET /api/integrations/flytbase/token]', err);
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const flytbaseUser = await verifyFlytbaseTokenAndGetUser(
      parsed.data.token,
      parsed.data.orgId,
    );

    await saveFlytbaseConfig(
      session!.user.userId,
      parsed.data.token,
      parsed.data.orgId,
    );

    logEvent({
      eventType: 'UPDATE',
      entityType: 'flytbase_integration',
      description: `FlytBase API token saved for user ${session!.user.email}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true, flytbaseUser });
  } catch (err) {
    console.error('[POST /api/integrations/flytbase/token]', err);
    return internalError(E.SV001, err);
  }
}

export async function DELETE() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    await removeFlytbaseToken(session!.user.userId);

    logEvent({
      eventType: 'DELETE',
      entityType: 'flytbase_integration',
      description: `FlytBase API token removed for user ${session!.user.email}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/integrations/flytbase/token]', err);
    return internalError(E.SV001, err);
  }
}
