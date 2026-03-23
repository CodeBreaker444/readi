import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteOperation, getOperation, updateOperation } from '@/backend/services/operation/operation-service';
import { UpdateOperationSchema } from '@/config/types/operation';
import { getUserSession } from '@/lib/auth/server-session';
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
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const operation = await getOperation(id);
    if (!operation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(operation);
  } catch (err) {
    console.error('[GET /api/operation/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const session = await getUserSession();
    const body = await req.json();
    const validated = updateOperationSchema.parse(body) as UpdateOperationSchema;
    const updated = await updateOperation(id, validated);

    if (session) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'operation',
        entityId: id,
        description: `Updated operation #${id}${validated.mission_name ? ` '${validated.mission_name}'` : ''}`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId: session.user.ownerId,
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('[PUT /api/operations/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

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
    console.error('[DELETE /api/operation/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}