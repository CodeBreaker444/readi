import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addComponent } from '@/backend/services/system/system-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ComponentSchema = z.object({
  fk_tool_id: z.number().positive(),
  component_type: z.string().min(1, "Type is required"),
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
      component_code: d.component_code,
      component_desc: d.component_desc,
      component_sn: d.component_sn,
      component_activation_date: d.component_activation_date,
      component_purchase_date: d.component_purchase_date,
      component_vendor: d.component_vendor,
      component_guarantee_day: d.component_guarantee_day,
      component_status: d.component_status,
      fk_tool_model_id: d.fk_tool_model_id,
      cc_platform: d.cc_platform,
      gcs_type: d.gcs_type,
      maintenance_cycle: d.maintenance_cycle,
      maintenance_cycle_hour: d.maintenance_cycle_hour,
      maintenance_cycle_day: d.maintenance_cycle_day,
      maintenance_cycle_flight: d.maintenance_cycle_flight,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'system',
        description: `Added component '${d.component_code ?? d.component_type}' to system #${d.fk_tool_id}`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId: session.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ code: 0, message: error.message }, { status: 500 });
  }
}