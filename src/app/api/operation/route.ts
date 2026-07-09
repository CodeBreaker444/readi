import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getToolName, getUserName } from '@/backend/services/shared/entity-names';
import { notifyDccMissionCreation } from '@/backend/services/mission/dcc-callback-service';
import { notifyPilotAssignment } from '@/backend/services/notification/notification-service';
import { createOperation, deleteOperation, listOperations } from '@/backend/services/operation/operation-service';
import { assertToolNotInMaintenance, assertToolNotNonOperational } from '@/backend/services/system/maintenance-ticket';
import { CreateOperationSchema, ListOperationsQuerySchema } from '@/config/types/operation';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';



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
  visual_observer_ids: z.array(z.number().int().positive()).optional().nullable(),
  fk_erp_group_id: z.number().int().positive().nullable().optional(),
  flight_mode: z.enum(['RC', 'DOCK']).nullable().optional(),
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

    const validated = createOperationSchema.parse(body) as CreateOperationSchema;

    if (validated.fk_tool_id) {
      try {
        await assertToolNotNonOperational(validated.fk_tool_id);
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

    if (dcc.outcome === 'http_error' || dcc.outcome === 'network_error') {
      console.warn('[POST /api/operation] DCC notification failed (non-fatal):', dcc.message);
    }

    if (validated.fk_pilot_user_id) {
      await notifyPilotAssignment({
        pilotUserId: validated.fk_pilot_user_id,
        missionId:   operation.pilot_mission_id,
        missionCode: operation.mission_code,
        fromUserId:  session.user.userId,
      });
    }

    const [systemName, pilotName] = await Promise.all([
      validated.fk_tool_id ? getToolName(validated.fk_tool_id) : Promise.resolve(null),
      validated.fk_pilot_user_id ? getUserName(validated.fk_pilot_user_id) : Promise.resolve(null),
    ]);

    logEvent({
      eventType: 'CREATE',
      entityType: 'operation',
      description: `Created operation '${validated.mission_code}'${validated.mission_name ? ` — ${validated.mission_name}` : ''} (status: ${validated.status_name}${systemName ? `, system: ${systemName}` : ''}${pilotName ? `, pilot: ${pilotName}` : ''})`,
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