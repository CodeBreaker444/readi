import { logEvent } from '@/backend/services/auditLog/audit-log';
import { notifyDccAcceptance } from '@/backend/services/mission/dcc-callback-service';
import { deleteOperation, getOperation, updateOperation } from '@/backend/services/operation/operation-service';
import { notifyPilotAssignment } from '@/backend/services/notification/notification-service';
import { UpdateOperationSchema } from '@/config/types/operation';
import { internalError, notFound, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const flexibleDatetime = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid datetime string' }
);

const updateOperationSchema = z.object({
  mission_code: z.string().min(1).optional(),
  mission_name: z.string().min(1).optional(),
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

    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return zodError(E.VL002, { flatten: () => ({ fieldErrors: {} }) });

    const body = await req.json();
    const validated = updateOperationSchema.parse(body) as UpdateOperationSchema;
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

    if (validated.fk_pilot_user_id) {
      await notifyPilotAssignment({
        pilotUserId: validated.fk_pilot_user_id,
        missionId:   id,
        missionCode: (updated as any).mission_code ?? `#${id}`,
        fromUserId:  session!.user.userId,
      });
    }

    // If a drone was just assigned to a mission that has a DCC planning link,
    // fire DCC acceptance now (it was skipped earlier when the drone wasn't set yet).
    let dcc: DccCallbackResult | undefined;
    const planningId = (updated as any)?.fk_planning_id ?? validated.fk_planning_id;
    if (validated.fk_tool_id && planningId) {
      dcc = await notifyDccAcceptance(session!.user.ownerId, planningId);
    }

    return NextResponse.json({ ...updated, ...(dcc ? { dcc } : {}) });
  } catch (err) {
    if (err instanceof ZodError) return zodError(E.VL011, err);
    return internalError(E.SV001, err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return zodError(E.VL002, { flatten: () => ({ fieldErrors: {} }) });

    const session = await getUserSession();
    await deleteOperation(id);

    if (session) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'operation',
        entityId: id,
        description: `Deleted operation #${id}`,
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
