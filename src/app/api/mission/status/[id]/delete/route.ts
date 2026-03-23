import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteMissionStatus } from '@/backend/services/mission/status-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ownerId = session.user.ownerId;
    const { id } = await params;
    const result = await deleteMissionStatus(ownerId, Number(id));

    if (result.code === 1) {
      logEvent({
        eventType: 'DELETE',
        entityType: 'mission_status',
        entityId: id,
        description: `Deleted mission status #${id}`,
        userId: session.user.userId,
        userName: session.user.fullname,
        userEmail: session.user.email,
        userRole: session.user.role,
        ownerId,
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