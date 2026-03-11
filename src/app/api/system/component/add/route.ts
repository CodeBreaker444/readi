import { addComponent } from '@/backend/services/system/tool/tool-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ComponentSchema = z.object({
  fk_tool_id: z.number().positive(),
  component_type: z.string().min(1, "Type is required"),
  fk_tool_model_id: z.number().optional().nullable(),
  component_sn: z.string().optional().nullable(),
  component_activation_date: z.string().optional().nullable(),
  component_purchase_date: z.string().optional().nullable(),
  component_vendor: z.string().optional().nullable(),
  component_guarantee_day: z.number().optional().nullable(),
  component_status: z.string().default('OPERATIONAL'),
  fk_client_id: z.number().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ComponentSchema.safeParse(body);

    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    if (!validation.success) {
      return NextResponse.json({
        code: 0,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const d = validation.data;

    const result = await addComponent({
      fk_tool_id: d.fk_tool_id,
      component_type: d.component_type,
      component_sn: d.component_sn,
      component_activation_date: d.component_activation_date,
      component_purchase_date: d.component_purchase_date,
      component_vendor: d.component_vendor,
      component_guarantee_day: d.component_guarantee_day,
      component_status: d.component_status,
      fk_client_id: d.fk_client_id,
      fk_tool_model_id: d.fk_tool_model_id,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, message: error.message }, { status: 500 });
  }
}