import { getTrainingUsers } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? undefined;

    const users = await getTrainingUsers(ownerId, q);
    return NextResponse.json({ code: 1, data: users });
  } catch (err: any) {
    console.error('[GET /api/training/users]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Error' }, { status: 500 });
  }
}
