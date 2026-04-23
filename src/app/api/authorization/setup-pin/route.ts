import { upsertAuthorizationKey } from '@/backend/services/authorization/authorization-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const bodySchema = z.object({
  encryptedPrivateKey: z.string().min(1),
  publicKey:           z.string().min(1),
  salt:                z.string().min(1),
  iv:                  z.string().min(1),
  keyFingerprint:      z.string().min(1),
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
    await upsertAuthorizationKey({
      userId:              session!.user.userId,
      ownerId:             session!.user.ownerId,
      encryptedPrivateKey: parsed.data.encryptedPrivateKey,
      publicKey:           parsed.data.publicKey,
      salt:                parsed.data.salt,
      iv:                  parsed.data.iv,
      keyFingerprint:      parsed.data.keyFingerprint,
    });

    return NextResponse.json({ code: 1, message: 'Authorization PIN set successfully' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
