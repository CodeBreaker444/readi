import { logEvent } from '@/backend/services/auditLog/audit-log';
import { notifyDccMissionCreation } from '@/backend/services/mission/dcc-callback-service';
import { notifyPilotAssignment } from '@/backend/services/notification/notification-service';
import { createOperation, createRecurringOperations, deleteOperation, listOperations } from '@/backend/services/operation/operation-service';
import { assertToolNotInMaintenance } from '@/backend/services/system/maintenance-ticket';
import { CreateOperationSchema, ListOperationsQuerySchema } from '@/config/types/operation';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

// Only 409 or 422 mean DCC explicitly rejected the data, all other errors are non-blocking.
const DCC_REJECTION_CODES = new Set([409, 422]);

const listOperationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED']).optional(),
  search: z.string().optional(),
  pilot_id: z.coerce.number().int().positive().optional(),
  tool_id: z.coerce.number().int().positive().optional(),
  client_id: z.coerce.number().int().positive().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});
const createOperationSchema = z.object({
  mission_name: z.string().nullable().optional(),
  mission_code: z.string().min(1),
  status_name: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED']),
  mission_description: z.string().nullable().optional(),
  scheduled_start: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid datetime string' }
  ).nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  fk_pilot_user_id: z.number().int().positive(),
  fk_tool_id: z.number().int().positive().nullable().optional(),
  fk_client_id: z.number().int().positive().nullable().optional(),
  fk_planning_id: z.number().int().positive().nullable().optional(),
  fk_mission_type_id: z.number().int().positive().nullable().optional(),
  fk_mission_category_id: z.number().int().positive().nullable().optional(),
  fk_luc_procedure_id: z.number().int().positive(),
  actual_end: z.string().nullable().optional(),
});

const createRecurringSchema = z.object({
  mission_name: z.string().min(1),
  mission_code: z.string().optional(),
  mission_description: z.string().nullable().optional(),
  scheduled_start: z.string(),
  actual_end: z.string().nullable().optional(),
  fk_pilot_user_id: z.number().int().positive(),
  fk_tool_id: z.number().int().positive().nullable().optional(),
  fk_client_id: z.number().int().positive().nullable().optional(),
  fk_planning_id: z.number().int().positive().nullable().optional(),
  fk_mission_type_id: z.number().int().positive().nullable().optional(),
  fk_mission_category_id: z.number().int().positive().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  days_of_week: z.array(z.number().int().min(0).max(6)).min(1),
  recur_until: z.string(),
  mission_group_label: z.string().nullable().optional(),
  fk_luc_procedure_id: z.number().int().positive(),
  is_recurring: z.literal(true),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;

    const { searchParams } = new URL(req.url);
    const query = listOperationsQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      pilot_id: searchParams.get('pilot_id') ?? undefined,
      tool_id: searchParams.get('tool_id') ?? undefined,
      client_id: searchParams.get('client_id') ?? undefined,
      date_start: searchParams.get('date_start') ?? undefined,
      date_end: searchParams.get('date_end') ?? undefined,
    });

    const result = await listOperations(query as ListOperationsQuerySchema, ownerId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    console.error('[GET /api/operation]', err);
       return internalError(E.SV001, err);  
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session?.user.ownerId;

    const body = await req.json();

    if (body.is_recurring === true) {
      const validated = createRecurringSchema.parse(body);
      let result: Awaited<ReturnType<typeof createRecurringOperations>>;
      try {
        result = await createRecurringOperations(validated, ownerId);
      } catch (appErr: any) {
        return NextResponse.json({ success: false, error: appErr.message }, { status: 400 });
      }

      const dcc = await notifyDccMissionCreation(ownerId, {
        type: 'SCHEDULED',
        target: validated.mission_name,
        missions: result.missions.map((m) => ({
          missionId:     m.dccMissionId,
          startDateTime: m.startDateTime,
        })),
        notes:    validated.notes ?? undefined,
        operator: session.user.email ?? undefined,
      });

      if (dcc.outcome === 'http_error' && DCC_REJECTION_CODES.has(dcc.httpStatus!)) {
        await Promise.allSettled(result.missions.map((m) => deleteOperation(m.pilotMissionId)));
        return NextResponse.json(
          { success: false, error: 'DCC rejected the mission creation - operation rolled back', dcc },
          { status: 502 },
        );
      }

      logEvent({
        eventType: 'CREATE',
        entityType: 'operation',
        description: `Created ${result.count} recurring operation(s) '${validated.mission_name}'`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId,
      });
      return NextResponse.json({ success: true, count: result.count, first_id: result.first_id, dcc }, { status: 201 });
    }

    const validated = createOperationSchema.parse(body) as CreateOperationSchema;

    if (validated.fk_tool_id) {
      try {
        await assertToolNotInMaintenance(validated.fk_tool_id);
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    let operation;
    try {
      operation = await createOperation({ ...validated }, ownerId);
    } catch (appErr: any) {
      return NextResponse.json({ error: appErr.message }, { status: 400 });
    }

    const dcc = await notifyDccMissionCreation(ownerId, {
      type: 'ON-DEMAND',
      target: validated.mission_name,
      missions: [{
        missionId:     operation.mission_code,
        startDateTime: operation.scheduled_start ?? new Date().toISOString(),
      }],
      notes:    validated.notes ?? undefined,
      operator: session.user.email ?? undefined,
    });

    if (dcc.outcome === 'http_error' && DCC_REJECTION_CODES.has(dcc.httpStatus!)) {
      await deleteOperation(operation.pilot_mission_id);
      return NextResponse.json(
        { success: false, error: 'DCC rejected the mission creation - operation rolled back', dcc },
        { status: 502 },
      );
    }

    if (validated.fk_pilot_user_id) {
      await notifyPilotAssignment({
        pilotUserId: validated.fk_pilot_user_id,
        missionId:   operation.pilot_mission_id,
        missionCode: operation.mission_code,
        fromUserId:  session.user.userId,
      });
    }

    logEvent({
      eventType: 'CREATE',
      entityType: 'operation',
      description: `Created operation '${validated.mission_name}'`,
      userId: session.user.userId,
      userName: session.user.fullname,
      userEmail: session.user.email,
      userRole: session.user.role,
      ownerId,
    });
    return NextResponse.json({ success: true, ...operation, dcc }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
    }
    console.error('[POST /api/operation]', err);
    return internalError(E.SV001, err);  
  }
}