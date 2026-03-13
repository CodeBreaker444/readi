import { updateComponent } from '@/backend/services/system/system-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  fk_tool_id: z.number().positive(),
  component_type: z.string().min(1),
  component_code: z.string().optional().nullable(),
  component_desc: z.string().optional().nullable(),
  fk_tool_model_id: z.number().optional().nullable(),
  component_sn: z.string().optional().nullable(),
  component_activation_date: z.string().optional().nullable(),
  component_purchase_date: z.string().optional().nullable(),
  component_vendor: z.string().optional().nullable(),
  component_guarantee_day: z.number().optional().nullable(),
  component_status: z.string().default('OPERATIONAL'),
  cc_platform: z.string().optional().nullable(),
  gcs_type: z.string().optional().nullable(),
  maintenance_cycle: z.string().optional().nullable(),
  maintenance_cycle_hour: z.number().optional().nullable(),
  maintenance_cycle_day: z.number().optional().nullable(),
  maintenance_cycle_flight: z.number().optional().nullable(),
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

    const result = await updateComponent(Number(id), parsed.data);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, status: 'ERROR', message: error.message }, { status: 500 });
  }
}