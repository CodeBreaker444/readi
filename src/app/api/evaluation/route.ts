
import { getEvaluationList } from '@/backend/services/planning/evaluation-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const evaluations = await getEvaluationList(session!.user.ownerId);

    return NextResponse.json({
      code: 1,
      message: 'Evaluation list fetched successfully',
      data: evaluations,
      dataRows: evaluations.length,
    });
  } catch (err) {
    return internalError(E.SV001, err); 
  }
}
