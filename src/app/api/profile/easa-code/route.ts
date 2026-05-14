import { updateCompanyEasaCode } from '@/backend/services/company/owner-service';
import { internalError, forbidden } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const schema = z.object({
  easa_operator_code: z.string().max(100).nullable(),
});

export async function PATCH(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    if (session!.user.role !== 'ADMIN') {
      return forbidden(E.PX001);
    }

    const body = await req.json();
    const validated = schema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { success: false, errors: validated.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    await updateCompanyEasaCode(session!.user.ownerId, validated.data.easa_operator_code);

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
