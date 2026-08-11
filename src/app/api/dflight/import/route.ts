import { logEvent } from '@/backend/services/auditLog/audit-log';
import { importDFlightDrone } from '@/backend/services/integrations/dflight-import-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ImportSchema = z.object({
  dFlightId: z.string().min(1),
  fk_tool_id: z.number().positive().optional().nullable(),
  fk_client_id: z.number().positive().optional().nullable(),
  tool_code: z.string().max(50).optional().nullable(),
  tool_description: z.string().optional().nullable(),
  component_code: z.string().min(1),
  component_sn: z.string().min(1),
  fk_tool_model_id: z.number().positive(),
  drone_classes: z.array(z.string()).optional().nullable(),
  uas_serial_number: z.string().optional().nullable(),
  gcs_serial_number: z.string().optional().nullable(),
  insurance_name: z.string().optional().nullable(),
  insurance_company: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  insurance_alert_recipients: z.array(z.string().email()).optional().nullable(),
  insurance_alert_days_before: z.number().int().positive().max(365).optional().nullable(),
  certifications: z.object({
    sts_declarations: z.string().optional().nullable(),
  }).optional().nullable(),
  qr_code_image: z.string().optional().nullable(),
}).refine((d) => d.fk_tool_id != null || !!d.tool_code?.trim(), {
  message: 'Either an existing system or a new system code must be provided.',
  path: ['tool_code'],
}).refine((d) => d.fk_tool_id != null || d.fk_client_id != null, {
  message: 'Client is required when creating a new system.',
  path: ['fk_client_id'],
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'create');
    if (featureError) return featureError;

    const body = await req.json();
    const validation = ImportSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const d = validation.data;

    const result = await importDFlightDrone({
      fk_owner_id: session!.user.ownerId,
      fk_tool_id: d.fk_tool_id ?? null,
      fk_client_id: d.fk_client_id ?? null,
      dFlightId: d.dFlightId,
      tool_code: d.tool_code ?? null,
      tool_description: d.tool_description ?? null,
      component_code: d.component_code,
      component_sn: d.component_sn,
      fk_tool_model_id: d.fk_tool_model_id,
      drone_classes: d.drone_classes ?? null,
      uas_serial_number: d.uas_serial_number ?? null,
      gcs_serial_number: d.gcs_serial_number ?? null,
      insurance_name: d.insurance_name ?? null,
      insurance_company: d.insurance_company ?? null,
      insurance_expiry_date: d.insurance_expiry_date ?? null,
      insurance_alert_recipients: d.insurance_alert_recipients ?? null,
      insurance_alert_days_before: d.insurance_alert_days_before ?? null,
      certifications: d.certifications ?? null,
      qr_code_image: d.qr_code_image ?? null,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'system',
        description: d.fk_tool_id
          ? `Imported drone '${d.component_code}' from D-Flight (id: ${d.dFlightId}) into existing system #${d.fk_tool_id}`
          : `Imported drone '${d.component_code}' from D-Flight (id: ${d.dFlightId}) as system '${d.tool_code}'`,
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
