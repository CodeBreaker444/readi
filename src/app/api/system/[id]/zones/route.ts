import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getSystemZones, saveSystemZones } from '@/backend/services/system/system-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { operationZonesSchema } from '@/lib/operation-zones';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const result = await getSystemZones(Number(id), session!.user.ownerId);
    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    const { error: featureError } = await requireFeatureAccess('systems_manage', 'edit');
    if (featureError) return featureError;

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = operationZonesSchema.safeParse(body?.operationZones);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const result = await saveSystemZones(Number(id), session!.user.ownerId, parsed.data);
    if (result.code === 1) {
      logEvent({
        eventType: 'UPDATE',
        entityType: 'system',
        entityId: Number(id),
        description: `Updated operation zones of system '${result.toolCode}' (${parsed.data.zones.length} zones${parsed.data.perimeter ? ', perimeter set' : ''})`,
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
