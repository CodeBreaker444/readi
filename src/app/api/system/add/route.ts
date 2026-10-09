import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addSystem } from '@/backend/services/system/system-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const toolSchema = z.object({
  tool_code: z.string({ error: 'System code is required' }).trim().min(1, 'System code is required').max(50),
  tool_name: z.string().optional(),
  tool_description: z.string().optional().nullable(),
  tool_active: z.string().default('Y'),
  clientId: z.number({ error: 'Client is required' }).positive('Client is required'),
  location: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationPseudoName: z.string().max(255).optional().nullable(),
  activationDate: z.string().optional().nullable(),
});
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'create');
    if (featureError) return featureError;

    // An empty or malformed request must fall through to schema validation (400
    // with per-field errors) rather than throw and surface as a 500.
    let formData: FormData | null = null;
    try {
      formData = await request.formData();
    } catch {
      formData = null;
    }

    let body: Record<string, any> = {};
    const rawData = formData?.get('data');
    if (typeof rawData === 'string' && rawData.trim()) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
      } catch {
        body = {};
      }
    }

    const files = (formData?.getAll('files') ?? []).filter((f): f is File => f instanceof File && f.size > 0);
    const ownerId = session!.user.ownerId;

    const toValidate = { ...body, clientId: body.fk_client_id ?? body.clientId };
    const validation = toolSchema.safeParse(toValidate);
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const data = validation.data;
    const result = await addSystem({
      fk_owner_id: ownerId,
      tool_code: data.tool_code,
      tool_name: data.tool_code,
      tool_description: data.tool_description,
      tool_active: data.tool_active,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      locationPseudoName: data.locationPseudoName,
      activationDate: data.activationDate,
      clientId: data.clientId,
      files,
    });

    if (result.code === 2) {
      return NextResponse.json(result);
    }

    if (result.code === 1) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'system',
        description: `Created system '${data.tool_code}'${data.location ? ` at ${data.location}` : ''}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
