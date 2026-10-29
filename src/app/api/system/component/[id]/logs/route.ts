import { getAuditLogs } from '@/backend/services/auditLog/audit-log';
import { getComponentMissions, getComponentTicketEvents } from '@/backend/services/system/maintenance-ticket-queries';
import { prisma } from '@/lib/prisma';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const componentId = Number(id);
    if (!componentId) return NextResponse.json({ code: 0, message: 'Invalid component id' }, { status: 400 });

    const [auditResult, ticketEvents, missions, compMeta] = await Promise.all([
      getAuditLogs({
        ownerId: session!.user.ownerId,
        entityType: 'system_component',
        entityId: componentId,
        page: 1,
        pageSize: 100,
      }),
      getComponentTicketEvents(componentId),
      getComponentMissions(componentId),
      prisma.tool_component.findUnique({
        where: { component_id: componentId },
        select: { component_metadata: true },
      }),
    ]);

    const locationHistory: { latitude: number | null; longitude: number | null; pseudo_name?: string | null; previous_pseudo_name?: string | null; changed_at: string }[] =
      (compMeta?.component_metadata as any)?.location_history ?? [];

    return NextResponse.json({
      code: 1,
      audit_logs: auditResult.data,
      ticket_events: ticketEvents,
      missions,
      location_history: locationHistory,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
