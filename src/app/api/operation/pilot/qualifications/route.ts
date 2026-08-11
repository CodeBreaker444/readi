import { getTrainingCurriculum } from '@/backend/services/training/training-service';
import { listQualifications } from '@/backend/services/user/qualification-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

const getSchema = z.object({
  user_id: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { user_id } = getSchema.parse({ user_id: req.nextUrl.searchParams.get('user_id') });
    const ownerId = session!.user.ownerId;

    const [qualifications, curriculum] = await Promise.all([
      listQualifications(user_id, ownerId),
      getTrainingCurriculum(user_id, ownerId),
    ]);

    return NextResponse.json({ qualifications, curriculum });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
