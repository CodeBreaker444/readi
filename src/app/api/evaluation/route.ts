
import { getEvaluationList } from '@/backend/services/planning/evaluation-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const evaluations = await getEvaluationList(session!.user.ownerId);

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'success',
      data: evaluations,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
