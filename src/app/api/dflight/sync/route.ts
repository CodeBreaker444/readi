import { logEvent } from '@/backend/services/auditLog/audit-log';
import { syncDFlightDrone } from '@/backend/services/integrations/dflight-sync-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SyncSchema = z.object({
  componentId: z.number().positive(),
  dFlightId: z.string().min(1),
  drone_classes: z.array(z.string()).optional().nullable(),
  uas_serial_number: z.string().optional().nullable(),
  gcs_serial_number: z.string().optional().nullable(),
  insurance_name: z.string().optional().nullable(),
  insurance_company: z.string().optional().nullable(),
  insurance_expiry_date: z.string().optional().nullable(),
  qr_code_image: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'edit');
    if (featureError) return featureError;

    const body = await req.json();
    const validation = SyncSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const d = validation.data;

    const result = await syncDFlightDrone({
      fk_owner_id: session!.user.ownerId,
      component_id: d.componentId,
      dFlightId: d.dFlightId,
      drone_classes: d.drone_classes ?? null,
      uas_serial_number: d.uas_serial_number ?? null,
      gcs_serial_number: d.gcs_serial_number ?? null,
      insurance_name: d.insurance_name ?? null,
      insurance_company: d.insurance_company ?? null,
      insurance_expiry_date: d.insurance_expiry_date ?? null,
      qr_code_image: d.qr_code_image ?? null,
    });

    if (result.code === 1) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'component',
        description: `Synced component #${d.componentId} from D-Flight (id: ${d.dFlightId})`,
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
