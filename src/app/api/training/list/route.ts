import { getFlatTrainingList } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const data = await getFlatTrainingList(session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err: any) {
    console.error('[GET /api/training/list]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Error' }, { status: 500 });
  }
}
