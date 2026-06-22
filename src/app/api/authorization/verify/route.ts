import { markTransactionVerified } from '@/backend/services/authorization/authorization-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json() as { id?: string; status?: string };
  const { id, status } = body;

  if (!id || (status !== 'valid' && status !== 'invalid')) {
    return NextResponse.json({ code: 0, message: 'Invalid payload' }, { status: 400 });
  }

  try {
    await markTransactionVerified(id, session!.user.ownerId, status);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
