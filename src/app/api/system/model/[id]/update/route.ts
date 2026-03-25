import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateModel } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  manufacturer:    z.string().min(1),
  model_code:      z.string().min(1),
  model_name:      z.string().min(1),
  model_type:      z.string().optional().nullable(),
  max_flight_time: z.number().optional().nullable(),
  max_speed:       z.number().optional().nullable(),
  max_altitude:    z.number().optional().nullable(),
  weight:          z.number().optional().nullable(),
  notes:           z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateModel(Number(id), {
      ...parsed.data,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'system',
        entityId: id,
        description: `Updated system model '${parsed.data.model_name}' (${parsed.data.model_code})`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, status: 'ERROR', message: error.message }, { status: 500 });
  }
}
