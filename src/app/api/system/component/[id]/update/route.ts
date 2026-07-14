import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getToolCode, updateComponent } from '@/backend/services/system/system-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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
  insurance_name: z.string().optional().nullable(),
  insurance_company: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'edit');
    if (featureError) return featureError;

    const { id } = await params;
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) return zodError(E.VL009, parsed.error);

    const existing = await prisma.tool_component.findUnique({
      where: { component_id: Number(id) },
      select: { component_metadata: true, fk_tool_id: true },
    });

    const wasDetached = (existing?.component_metadata as any)?.system_detached === true;
    const isNowDetached = parsed.data.system_detached === true;
    const movedToWarehouse = !wasDetached && isNowDetached;
    const movedFromWarehouse = wasDetached && !isNowDetached;

    const result = await updateComponent(Number(id), {
      ...parsed.data,
      fk_parent_component_id: parsed.data.fk_parent_component_id ?? null,
      initial_usage_hours: parsed.data.initial_usage_hours ?? null,
      initial_maintenance_hours: parsed.data.initial_maintenance_hours ?? null,
      initial_maintenance_flights: parsed.data.initial_maintenance_flights ?? null,
    }, session!.user.ownerId);

    if (result.code === 1) {
      const systemCode = await getToolCode(parsed.data.fk_tool_id, session!.user.ownerId);
      const lat = parsed.data.latitude;
      const lng = parsed.data.longitude;
      const hasCoords = lat != null && lng != null;
      const hasOldPosition = result.oldPosition && (result.oldPosition.latitude != null || result.oldPosition.longitude != null);
      
      let posPart = '';
      if (hasCoords && hasOldPosition) {
        const oldLat = result.oldPosition.latitude ?? '—';
        const oldLng = result.oldPosition.longitude ?? '—';
        posPart = ` — position: ${oldLat}, ${oldLng} → ${lat}, ${lng}`;
      } else if (hasCoords) {
        posPart = ` — position: ${lat}, ${lng}`;
      }

      let description = '';
      if (movedToWarehouse) {
        description = `Moved component '${parsed.data.component_code ?? parsed.data.component_name ?? parsed.data.component_type}' (type: ${parsed.data.component_type}) to Warehouse${parsed.data.component_sn ? ` — SN: ${parsed.data.component_sn}` : ''}`;
      } else if (movedFromWarehouse) {
        description = `Moved component '${parsed.data.component_code ?? parsed.data.component_name ?? parsed.data.component_type}' (type: ${parsed.data.component_type}) from Warehouse to system '${systemCode ?? parsed.data.fk_tool_id}'${parsed.data.component_sn ? ` — SN: ${parsed.data.component_sn}` : ''}`;
      } else {
        description = `Updated component '${parsed.data.component_code ?? parsed.data.component_name ?? parsed.data.component_type}' (type: ${parsed.data.component_type}) on system '${systemCode ?? parsed.data.fk_tool_id}'${parsed.data.component_sn ? ` — SN: ${parsed.data.component_sn}` : ''}${posPart}`;
      }

      const metadata: Record<string, unknown> = {};
      if (hasOldPosition) {
        metadata.oldPosition = result.oldPosition;
      }

      logEvent({
        eventType: 'UPDATE',
        entityType: 'system_component',
        description,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}