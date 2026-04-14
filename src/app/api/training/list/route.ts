import { getFlatTrainingList } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const data = await getFlatTrainingList(session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
