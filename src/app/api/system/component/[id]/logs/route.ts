import { getAuditLogs } from '@/backend/services/auditLog/audit-log';
import { getComponentTicketEvents } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const componentId = Number(id);
    if (!componentId) return NextResponse.json({ code: 0, message: 'Invalid component id' }, { status: 400 });

    const [auditResult, ticketEvents] = await Promise.all([
      getAuditLogs({
        ownerId: session.user.ownerId,
        entityType: 'system_component',
        entityId: componentId,
        page: 1,
        pageSize: 100,
      }),
      getComponentTicketEvents(componentId),
    ]);

    return NextResponse.json({
      code: 1,
      audit_logs: auditResult.data,
      ticket_events: ticketEvents,
    });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
  }
}
