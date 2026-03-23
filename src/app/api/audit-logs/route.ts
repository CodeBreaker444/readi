import { AuditEventType, getAuditLogs } from '@/backend/services/auditLog/audit-log';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const { role, ownerId } = session.user;

    // Only ADMIN and SUPERADMIN can access audit logs
    if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.json({ code: 0, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // SUPERADMIN can query any owner or all owners; ADMIN is strictly locked to their own owner
    let targetOwnerId: number | undefined;
    if (role === 'SUPERADMIN') {
      const ownerParam = searchParams.get('owner_id');
      targetOwnerId = ownerParam ? parseInt(ownerParam, 10) : undefined;
    } else {
      targetOwnerId = ownerId;
    }

    const userId    = searchParams.get('user_id');
    const eventType = searchParams.get('event_type') as AuditEventType | null;
    const entityType = searchParams.get('entity_type');
    const dateFrom  = searchParams.get('date_from');
    const dateTo    = searchParams.get('date_to');
    const page      = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize  = parseInt(searchParams.get('page_size') ?? '50', 10);

    const result = await getAuditLogs({
      ownerId:    targetOwnerId,
      userId:     userId ? parseInt(userId, 10) : undefined,
      eventType:  eventType ?? undefined,
      entityType: entityType ?? undefined,
      dateFrom:   dateFrom ?? undefined,
      dateTo:     dateTo   ?? undefined,
      page,
      pageSize:   Math.min(pageSize, 200), 
    });

    return NextResponse.json({
      code: 1,
      ...result,
    });
  } catch (error: any) {
    console.error('Audit logs API error:', error);
    return NextResponse.json(
      { code: 0, message: error.message ?? 'Internal server error' },
      { status: 500 }
    );
  }
}
