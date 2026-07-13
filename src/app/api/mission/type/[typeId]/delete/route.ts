import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteMissionType } from '@/backend/services/mission/mission-type';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('mission_type', 'delete');
    if (featureError) return featureError;

    const ownerId = session!.user.ownerId;
    const { typeId } = await params;

    const result = await deleteMissionType(ownerId, Number(typeId));

    const typeLabel = result.typeCode ?? `#${typeId}`;
    logEvent({
      eventType: 'DELETE',
      entityType: 'mission_type',
      entityId: typeId,
      description: `Deleted mission type '${typeLabel}'${result.typeName ? ` — ${result.typeName}` : ''} (ID ${typeId})`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
