import { requireAuth } from '@/lib/auth/api-auth';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const permissions = await getSessionEffectivePermissions(session!.user);

    return NextResponse.json({
      code: 1,
      data: {
        permissions,
        isManager: session!.user.isManager,
      },
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
