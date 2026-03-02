import { deleteEvaluationFile } from '@/backend/services/planning/evaluationFiles';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const session = await getUserSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId } = await params;   
    const fileIdNum = parseInt(fileId);
    const ownerId = session.user.ownerId;

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