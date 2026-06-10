import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteMissionStatus } from '@/backend/services/mission/status-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const { id } = await params;
    const result = await deleteMissionStatus(ownerId, Number(id));

    if (result.code === 1) {
      const statusLabel = result.statusCode ?? `#${id}`;
      logEvent({
        eventType: 'DELETE',
        entityType: 'mission_status',
        entityId: id,
        description: `Deleted mission status '${statusLabel}'${result.statusName ? ` — ${result.statusName}` : ''} (ID ${id})`,
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
