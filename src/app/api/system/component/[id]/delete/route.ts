import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteComponent } from '@/backend/services/system/system-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const force = body.force === true;

    const result = await deleteComponent(session.user.ownerId, Number(id), force);

    if (result.code === 1) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'system',
        entityId: id,
        description: `Deleted component #${id}`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId: session.user.ownerId,
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
