import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addMissionStatus } from '@/backend/services/mission/status-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
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
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await request.json();

    const validation = missionStatusSchema.safeParse(body);
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const ownerId = session!.user.ownerId;
    const result = await addMissionStatus(ownerId, {
      code: validation.data.mission_status_code,
      name: validation.data.mission_status_name,
      description: validation.data.mission_status_desc,
      order: validation.data.status_order,
      isFinalStatus: validation.data.is_final_status
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'mission_status',
        description: `Created mission status '${validation.data.mission_status_name}' (${validation.data.mission_status_code})`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
