import { getTrainingCurriculum } from '@/backend/services/training/training-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const url = new URL(req.url);
    const userIdParam = url.searchParams.get('user_id');
    const userId = userIdParam ? parseInt(userIdParam, 10) : session!.user.userId;

    const curriculum = await getTrainingCurriculum(userId, session!.user.ownerId);
    return NextResponse.json({ code: 1, data: curriculum });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
