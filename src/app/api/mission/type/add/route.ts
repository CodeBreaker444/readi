import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addMissionType } from '@/backend/services/mission/mission-type';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const missionTypeSchema = z.object({
  mission_type_name: z.string().min(1, 'Mission type name is required'),
  mission_type_desc: z.string().optional(),
  mission_type_code: z.string().min(1, 'Mission type code is required'),
  mission_type_label: z.string().optional(),
});

export async function POST( request: NextRequest ) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await request.json();

    const validation = missionTypeSchema.safeParse(body);
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const ownerId = session!.user.ownerId;
    const result = await addMissionType(ownerId, {
      mission_type_name: body.mission_type_name,
      mission_type_desc: body.mission_type_desc,
      mission_type_code: body.mission_type_code,
      mission_type_label: body.mission_type_label,
      fk_owner_id: ownerId
    });

    logEvent({
      eventType: 'CREATE',
      entityType: 'mission_type',
      description: `Created mission type '${body.mission_type_name}' (${body.mission_type_code})`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
