import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteMissionCategory } from '@/backend/services/mission/category-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
     const { session, error } = await requirePermission('view_config')
     if (error) return error;

    const ownerId = session!.user.ownerId;
    const { id } = await params;

    const result = await deleteMissionCategory(ownerId, Number(id));

    if (result.code === 1) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'mission_category',
        entityId: id,
        description: `Deleted mission category #${id}`,
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
