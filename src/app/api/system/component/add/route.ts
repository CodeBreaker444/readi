import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addComponent } from '@/backend/services/system/system-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ComponentSchema = z.object({
  fk_tool_id: z.number().positive(),
  component_type: z.string().min(1, "Type is required"),
  component_category: z.string().optional().nullable(),
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
  dcc_drone_id: z.string().uuid().optional().nullable(),
  drone_registration_code: z.string().optional().nullable(),
  maintenance_cycle: z.string().optional().nullable(),
  maintenance_cycle_hour: z.number().optional().nullable(),
  maintenance_cycle_day: z.number().optional().nullable(),
  maintenance_cycle_flight: z.number().optional().nullable(),
  battery_cycle_ratio: z.number().min(0).max(1).optional().nullable(),
  fk_parent_component_id: z.number().positive().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ComponentSchema.safeParse(body);

    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    if (!validation.success) return zodError(E.VL008, validation.error);

    const d = validation.data;

    const result = await addComponent({
      fk_tool_id: d.fk_tool_id,
      component_type: d.component_type,
      component_category: d.component_category,
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
      dcc_drone_id: d.dcc_drone_id,
      drone_registration_code: d.drone_registration_code,
      maintenance_cycle: d.maintenance_cycle,
      maintenance_cycle_hour: d.maintenance_cycle_hour,
      maintenance_cycle_day: d.maintenance_cycle_day,
      maintenance_cycle_flight: d.maintenance_cycle_flight,
      battery_cycle_ratio: d.battery_cycle_ratio ?? null,
      fk_parent_component_id: d.fk_parent_component_id ?? null,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'system_component',
        entityId: result.data?.component_id,
        description: `Added component '${d.component_code ?? d.component_type}' to system #${d.fk_tool_id}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}