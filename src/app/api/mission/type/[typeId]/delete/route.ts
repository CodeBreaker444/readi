import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteMissionType } from '@/backend/services/mission/mission-type';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ typeId: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    const ownerId = session!.user.ownerId;
    const { typeId } = await params;

    const result = await deleteMissionType(ownerId, Number(typeId));

    logEvent({
      eventType: 'DELETE',
      entityType: 'mission_type',
      entityId: typeId,
      description: `Deleted mission type ID ${typeId}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}