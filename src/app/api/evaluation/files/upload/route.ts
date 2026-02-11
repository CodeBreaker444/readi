import { uploadEvaluationFile } from '@/backend/services/planning/evaluationFiles';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string;
    const version = formData.get('version') as string;
    const evaluationId = parseInt(formData.get('evaluation_id') as string);
    const clientId = parseInt(formData.get('client_id') as string);

    const ownerId = (session.user as any).owner_id;

    const result = await uploadEvaluationFile(
      ownerId,
      clientId,
      evaluationId,
      file,
      description,
      version
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}