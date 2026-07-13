import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addComponent, getOrCreateWarehouseTool, getToolCode } from '@/backend/services/system/system-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ComponentSchema = z
  .object({
    fk_tool_id: z.number().positive().optional(),
    warehouse: z.boolean().optional(),
    component_type: z.string().min(1, 'Type is required'),
    component_category: z.string().optional().nullable(),
    component_code: z.string().optional().nullable(),
    component_desc: z.string().optional().nullable(),
    fk_tool_model_id: z.number().optional().nullable(),
    component_sn: z.string().optional().nullable(),
    component_activation_date: z.string().optional().nullable(),
    component_purchase_date: z.string().optional().nullable(),
    expiration_date: z.string().optional().nullable(),
    expiry_type: z.enum(['EXPIRATION_DATE', 'FLIGHTS', 'FLIGHT_HOURS', 'MIXED']).optional().default('EXPIRATION_DATE'),
    expiration_flights: z.number().int().positive().optional().nullable(),
    expiration_flight_hours: z.number().min(0).max(9999).optional().nullable(),
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
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    drone_classes: z.array(z.string()).optional().nullable(),
    initial_usage_hours: z.number().min(0).optional().nullable(),
    initial_maintenance_hours: z.number().min(0).optional().nullable(),
    initial_maintenance_flights: z.number().min(0).optional().nullable(),
    insurance_name: z.string().optional().nullable(),
    insurance_company: z.string().optional().nullable(),
    insurance_expiry_date: z.string().optional().nullable(),
  })
  .refine((data) => !!data.fk_tool_id || !!data.warehouse, {
    message: 'Either fk_tool_id or warehouse:true is required',
    path: ['fk_tool_id'],
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = ComponentSchema.safeParse(body);

    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'create');
    if (featureError) return featureError;

    if (!validation.success) return zodError(E.VL008, validation.error);

    const d = validation.data;

    const toolId = d.warehouse
      ? await getOrCreateWarehouseTool(session!.user.ownerId)
      : d.fk_tool_id!;

    const result = await addComponent({
      fk_tool_id: toolId,
      system_detached: d.warehouse ? true : undefined,
      component_type: d.component_type,
      component_category: d.component_category,
      component_code: d.component_code,
      component_desc: d.component_desc,
      component_sn: d.component_sn,
      component_activation_date: d.component_activation_date,
      component_purchase_date: d.component_purchase_date,
      expiration_date: d.expiration_date ?? null,
      expiry_type: d.expiry_type ?? 'EXPIRATION_DATE',
      expiration_flights: d.expiration_flights ?? null,
      expiration_flight_hours: d.expiration_flight_hours ?? null,
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
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      drone_classes: d.drone_classes ?? null,
      initial_usage_hours: d.initial_usage_hours ?? null,
      initial_maintenance_hours: d.initial_maintenance_hours ?? null,
      initial_maintenance_flights: d.initial_maintenance_flights ?? null,
      insurance_name: d.insurance_name ?? null,
      insurance_company: d.insurance_company ?? null,
      insurance_expiry_date: d.insurance_expiry_date ?? null,
    });

    if (result.code === 1) {
      const systemCode = d.warehouse ? null : await getToolCode(toolId, session!.user.ownerId);
      const label = d.component_code ?? d.component_type;
      const snInfo = d.component_sn ? `, SN: ${d.component_sn}` : '';
      const destination = d.warehouse
        ? 'Warehouse'
        : systemCode ? `system '${systemCode}'` : 'system';
      logEvent({
        eventType: 'CREATE',
        entityType: 'system_component',
        description: `Added component '${label}' (type: ${d.component_type}${snInfo}) to ${destination}`,
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
