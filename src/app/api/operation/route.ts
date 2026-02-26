import { createOperation, listOperations } from '@/backend/services/operation/operation-service';
import { CreateOperationSchema, ListOperationsQuerySchema } from '@/config/types/operation';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

const listOperationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ABORTED']).optional(),
  search: z.string().optional(),
  pilot_id: z.coerce.number().int().positive().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
});
const createOperationSchema = z.object({
  mission_name: z.string().min(1),
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
  fk_planning_id: z.number().int().positive().nullable().optional(),
  fk_mission_type_id: z.number().int().positive().nullable().optional(),
  fk_mission_category_id: z.number().int().positive().nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session?.user.ownerId;

    const { searchParams } = new URL(req.url);
    const query = listOperationsQuerySchema.parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      pilot_id: searchParams.get('pilot_id') ?? undefined,
      date_start: searchParams.get('date_start') ?? undefined,
      date_end: searchParams.get('date_end') ?? undefined,
    });

    const result = await listOperations(query as ListOperationsQuerySchema, ownerId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('[GET /api/operation]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    const operation = await createOperation({ ...validated }, ownerId);
    return NextResponse.json(operation, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.flatten() }, { status: 400 });
    }
    console.error('[POST /api/operation]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}