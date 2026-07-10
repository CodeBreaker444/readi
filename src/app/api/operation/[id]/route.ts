import { logEvent } from '@/backend/services/auditLog/audit-log';
import { notifyDccAcceptance } from '@/backend/services/mission/dcc-callback-service';
import { notifyPilotAssignment } from '@/backend/services/notification/notification-service';
import { deleteOperation, getOperation, updateOperation } from '@/backend/services/operation/operation-service';
import { UpdateOperationSchema } from '@/config/types/operation';
import { apiError, dbError, internalError, notFound, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const flexibleDatetime = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid datetime string' }
);

const updateOperationSchema = z.object({
  mission_code: z.string().min(1).optional(),
  mission_name: z.string().optional(),
  mission_description: z.string().nullable().optional(),
  scheduled_start: flexibleDatetime.nullable().optional(),
  actual_start: flexibleDatetime.nullable().optional(),
  actual_end: flexibleDatetime.nullable().optional(),
  flight_duration: z.number().nonnegative().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  fk_pilot_user_id: z.number().int().positive().optional(),
  fk_tool_id: z.number().int().positive().nullable().optional(),
  fk_client_id: z.number().int().positive().nullable().optional(),
  fk_planning_id: z.number().int().positive().nullable().optional(),
  fk_mission_status_id: z.number().int().positive().optional(),
  fk_mission_type_id: z.number().int().positive().nullable().optional(),
  fk_mission_category_id: z.number().int().positive().nullable().optional(),
  status_name: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED']).optional(),
  distance_flown: z.number().nonnegative().nullable().optional(),
  max_altitude: z.number().nonnegative().nullable().optional(),
  fk_erp_group_id: z.number().int().positive().nullable().optional(),
  flight_mode: z.enum(['RC', 'DOCK']).nullable().optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { error } = await requirePermission('view_operations');
    if (error) return error;

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return zodError(E.VL002, { flatten: () => ({ fieldErrors: {} }) });

    const operation = await getOperation(id);
    if (!operation) return notFound(E.NF004);

    return NextResponse.json(operation);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('operation_mission_table', 'edit');
    if (featureError) return featureError;

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return apiError(E.VL002, 400);

    const body = await req.json();
    const parsed = updateOperationSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL011, parsed.error);

    const validated = parsed.data as UpdateOperationSchema;
    const updated = await updateOperation(id, validated);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'operation',
      entityId: id,
      description: `Updated operation #${id}${validated.mission_name ? ` '${validated.mission_name}'` : ''}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    // Non-fatal: notification failure must not roll back a successful save
    if (validated.fk_pilot_user_id) {
      notifyPilotAssignment({
        pilotUserId: validated.fk_pilot_user_id,
        missionId:   id,
        missionCode: (updated as any).mission_code ?? `#${id}`,
        fromUserId:  session!.user.userId,
      }).catch((notifyErr) => console.error('[operation/update] pilot notification failed:', notifyErr));
    }

    let dcc: DccCallbackResult | undefined;
    const planningId = (updated as any)?.fk_planning_id ?? validated.fk_planning_id;
    if (validated.fk_tool_id && planningId) {
      try {
        dcc = await notifyDccAcceptance(session!.user.ownerId, planningId);
      } catch (dccErr) {
        console.error('[operation/update] DCC callback failed:', dccErr);
      }
    }

    return NextResponse.json({ ...updated, ...(dcc ? { dcc } : {}) });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'OPERATION_NOT_FOUND') return notFound(E.NF004);
    const pgCode: string | undefined = err?.code;
    if (pgCode === '23505') return apiError({ code: 'DB005', category: 'Database', message: 'Mission code is already in use by another operation', detail: 'Unique constraint violation on pilot_mission.mission_code during UPDATE.' }, 409);
    if (pgCode === '23503') return dbError(E.DB003, err);
    return internalError(E.SV001, err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { error: featureError } = await requireFeatureAccess('operation_mission_table', 'delete');
    if (featureError) return featureError;

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return zodError(E.VL002, { flatten: () => ({ fieldErrors: {} }) });

    const session = await getUserSession();
    const opInfo = await getOperation(id);
    await deleteOperation(id);

    if (session) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'operation',
        entityId: id,
        description: `Deleted operation '${opInfo?.mission_code ?? `#${id}`}'${opInfo?.mission_name ? ` — ${opInfo.mission_name}` : ''} (ID ${id})`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId: session.user.ownerId,
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
