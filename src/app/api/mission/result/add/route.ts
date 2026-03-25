import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addMissionResult } from '@/backend/services/mission/result-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const missionResultSchema = z.object({
  mission_result_code: z.string().min(1, 'Result code is required').max(50, 'Code too long'),
  mission_result_desc: z.string().min(1, 'Result description is required').max(255, 'Description too long'),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

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

    const ownerId = session!.user.ownerId;
    const result = await addMissionResult(ownerId, {
      code: validation.data.mission_result_code,
      description: validation.data.mission_result_desc
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'mission_result',
        description: `Created mission result '${validation.data.mission_result_desc}' (${validation.data.mission_result_code})`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}