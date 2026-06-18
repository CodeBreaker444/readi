import { logEvent } from '@/backend/services/auditLog/audit-log';
import { updateTool } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
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
   const { session, error } = await requirePermission('view_config');
       if (error) return error;

    const { id } = await params;
    const body = await request.json();

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const result = await updateTool(Number(id), parsed.data);

    if (result.code === 1) {
      const lat = parsed.data.tool_latitude;
      const lng = parsed.data.tool_longitude;
      const hasCoords = lat != null && lng != null;
      const locationPart = hasCoords
        ? ` — position: ${lat}, ${lng}${parsed.data.location ? ` (${parsed.data.location})` : ''}`
        : parsed.data.location ? ` — location: ${parsed.data.location}` : '';
      const statusPart = parsed.data.tool_status ? `, status: ${parsed.data.tool_status}` : '';
      logEvent({
        eventType: 'UPDATE',
        entityType: 'system',
        description: `Updated system '${parsed.data.tool_code}'${locationPart}${statusPart}`,
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
