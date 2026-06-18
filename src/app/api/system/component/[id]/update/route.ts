import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getToolCode, updateComponent } from '@/backend/services/system/system-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  fk_tool_id: z.number().positive(),
  component_type: z.string().min(1),
  component_name: z.string().optional().nullable(),
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
  system_detached: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  drone_classes: z.array(z.string()).optional().nullable(),
  initial_usage_hours: z.number().min(0).optional().nullable(),
  initial_maintenance_hours: z.number().min(0).optional().nullable(),
  initial_maintenance_flights: z.number().min(0).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL009, parsed.error);

    const result = await updateComponent(Number(id), {
      ...parsed.data,
      fk_parent_component_id: parsed.data.fk_parent_component_id ?? null,
      initial_usage_hours: parsed.data.initial_usage_hours ?? null,
      initial_maintenance_hours: parsed.data.initial_maintenance_hours ?? null,
      initial_maintenance_flights: parsed.data.initial_maintenance_flights ?? null,
    });

    if (result.code === 1) {
      const systemCode = await getToolCode(parsed.data.fk_tool_id, session!.user.ownerId);
      const lat = parsed.data.latitude;
      const lng = parsed.data.longitude;
      const posPart = (lat != null && lng != null) ? ` — position: ${lat}, ${lng}` : '';
      logEvent({
        eventType: 'UPDATE',
        entityType: 'system_component',
        description: `Updated component '${parsed.data.component_code ?? parsed.data.component_name ?? parsed.data.component_type}' (type: ${parsed.data.component_type}) on system '${systemCode ?? parsed.data.fk_tool_id}'${parsed.data.component_sn ? ` — SN: ${parsed.data.component_sn}` : ''}${posPart}`,
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