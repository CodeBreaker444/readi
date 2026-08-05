import { getFlightRequestsByEvaluationId } from '@/backend/services/planning/evaluation-detail';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { id } = await params;
    const evaluationId = Number(id);
    if (isNaN(evaluationId) || evaluationId <= 0) {
      return apiError(E.VL002, 400);
    }

    const items = await getFlightRequestsByEvaluationId(session!.user.ownerId, evaluationId);
    return NextResponse.json({ code: 1, items, dataRows: items.length });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
