import { getAuthorizationKey, storeTransactionSign } from '@/backend/services/authorization/authorization-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
  actionType:     z.string().min(1),
  entityType:     z.string().min(1),
  entityId:       z.string().optional(),
  jwtToken:       z.string().min(1),
  payloadPreview: z.record(z.string(), z.unknown()),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ code: 0, message: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return zodError(E.VL001, parsed.error)
  }

  try {
    const key = await getAuthorizationKey(session!.user.userId);
    if (!key) {
      return NextResponse.json(
        { code: 0, message: 'Authorization PIN not set up' },
        { status: 422 }
      );
    }

    const id = await storeTransactionSign({
      userId:          session!.user.userId,
      ownerId:         session!.user.ownerId,
      userName:        session!.user.fullname,
      actionType:      parsed.data.actionType,
      entityType:      parsed.data.entityType,
      entityId:        parsed.data.entityId,
      jwtToken:        parsed.data.jwtToken,
      payloadPreview:  parsed.data.payloadPreview,
      publicKeySnapshot: key.public_key,
    });

    return NextResponse.json({ code: 1, data: { id } });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
