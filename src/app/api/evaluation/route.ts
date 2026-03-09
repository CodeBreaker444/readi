 
import { getEvaluationList } from '@/backend/services/planning/evaluation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
     const session = await getUserSession()
     if(!session)
     {
        return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
     }

    const evaluations = await getEvaluationList(session.user.ownerId);

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
