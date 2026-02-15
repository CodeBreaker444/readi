import { addMissionStatus } from '@/backend/services/mission/status-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const missionStatusSchema = z.object({
  mission_status_code: z.string().min(1, 'Status code is required'),
  mission_status_name: z.string().min(1, 'Status name is required'),
  mission_status_desc: z.string().optional(),
  status_order: z.number().int().optional(),
  is_final_status: z.boolean().optional(),
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
    
    const validation = missionStatusSchema.safeParse(body);
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
    const result = await addMissionStatus(ownerId, {
      code: validation.data.mission_status_code,
      name: validation.data.mission_status_name,
      description: validation.data.mission_status_desc,
      order: validation.data.status_order,
      isFinalStatus: validation.data.is_final_status
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}