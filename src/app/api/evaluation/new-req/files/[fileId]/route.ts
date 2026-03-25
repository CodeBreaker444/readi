import { deleteEvaluationFile } from '@/backend/services/planning/evaluationFiles';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { fileId } = await params;
    const fileIdNum = parseInt(fileId);
    const ownerId = session!.user.ownerId;

    const result = await deleteEvaluationFile(fileIdNum, ownerId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}