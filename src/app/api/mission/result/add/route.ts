import { addMissionResult } from '@/backend/services/mission/result-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const missionResultSchema = z.object({
  mission_result_code: z.string().min(1, 'Result code is required').max(50, 'Code too long'),
  mission_result_desc: z.string().min(1, 'Result description is required').max(255, 'Description too long'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const validation = missionResultSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          code: 0, 
          status: 'ERROR', 
          message: 'Validation failed',
          errors: validation.error 
        },
        { status: 400 }
      );
    }

    const ownerId = session.user.ownerId;
    const result = await addMissionResult(ownerId, {
      code: validation.data.mission_result_code,
      description: validation.data.mission_result_desc
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}