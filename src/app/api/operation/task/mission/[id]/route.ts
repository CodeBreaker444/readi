import { getMissionTaskData } from '@/backend/services/operation/mission-task-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number((await params).id);
    if (!Number.isInteger(missionId) || missionId <= 0) {
      return NextResponse.json({ code: 0, message: 'Invalid mission id' }, { status: 400 });
    }

    const data = await getMissionTaskData({
      missionId,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ code: 1, message: 'Success', data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
