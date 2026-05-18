import { getAuditLogs } from '@/backend/services/auditLog/audit-log';
import { getComponentMissions, getComponentTicketEvents } from '@/backend/services/system/maintenance-ticket';
import { supabase } from '@/backend/database/database';
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
      supabase
        .from('tool_component')
        .select('component_metadata')
        .eq('component_id', componentId)
        .single(),
    ]);

    const locationHistory: { latitude: number; longitude: number; changed_at: string }[] =
      compMeta.data?.component_metadata?.location_history ?? [];

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
