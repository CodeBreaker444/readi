import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteModel } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

    const { id } = await params;
    const result = await deleteModel(session!.user.ownerId, Number(id));

    if (result.code === 1) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'system',
        entityId: id,
        description: `Deleted system model #${id}`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId: session!.user.ownerId,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}
