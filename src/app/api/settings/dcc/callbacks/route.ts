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

    const dcc = await resendDccOutboxItem(session!.user.ownerId, parsed.data.id);
    if (!dcc) return apiError(E.VL002, 404);

    return NextResponse.json({ code: 1, dcc });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
