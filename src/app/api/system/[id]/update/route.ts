import { updateTool } from '@/backend/services/system/system-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  tool_code:               z.string().min(1).max(50),
  tool_desc:               z.string().optional().nullable(),
  tool_status:             z.string().optional().nullable(),
  tool_active:             z.string().default('Y'),
  fk_client_id:            z.number().optional().nullable(),
  tool_latitude:           z.number().optional().nullable(),
  tool_longitude:          z.number().optional().nullable(),
  date_activation:         z.string().optional().nullable(),
  location:                z.string().optional().nullable(),
  tool_maintenance_logbook: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const result = await updateTool(Number(id), parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, status: 'ERROR', message: error.message }, { status: 500 });
  }
}
