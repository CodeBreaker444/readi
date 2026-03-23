import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteUser } from '@/backend/services/user/user-management';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session || session.user.role != 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    await deleteUser(body.user_id, session.user.ownerId);

    logEvent({
      eventType: 'DELETE',
      entityType: 'user',
      entityId: body.user_id,
      description: `Deleted user ID ${body.user_id}`,
      userId: session.user.userId,
      userName: session.user.fullname,
      userEmail: session.user.email,
      userRole: session.user.role,
      ownerId: session.user.ownerId,
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        code: 0,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}