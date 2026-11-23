import { logEvent } from '@/backend/services/auditLog/audit-log';
import { listDccOutbox, resendDccOutboxItem } from '@/backend/services/mission/dcc-outbox-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ResendSchema = z.object({ id: z.number().int().positive() });

/** Callbacks still pending retry or failed. */
export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;
    return NextResponse.json({ code: 1, data: await listDccOutbox(session!.user.ownerId) });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

/** Resend one callback immediately. */
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = ResendSchema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const dcc = await resendDccOutboxItem(user.ownerId, parsed.data.id);
    if (!dcc) return apiError(E.VL002, 404);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'dcc_callback_outbox',
      entityId: parsed.data.id,
      description: `Undelivered DCC callback #${parsed.data.id} (${dcc.path}) resent manually: ${dcc.outcome}`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
      metadata: { path: dcc.path, outcome: dcc.outcome, message: dcc.message },
    });

    return NextResponse.json({ code: 1, dcc });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
