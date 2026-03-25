import { sendNotificationToRoles } from '@/backend/services/notification/notification-service';
import { getComponentsForMaintenanceCycle } from '@/backend/services/operation/maintenance-cycle-service';
import { assertNoOpenTicketForTool, createTicket, hasOpenTicketForTool, setComponentsOperationalStatus, setSystemOperationalStatus } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const toolId = Number(req.nextUrl.searchParams.get('tool_id'));
    if (!toolId) return NextResponse.json({ has_open_ticket: false, components: [] });

    const [hasOpen, systemData] = await Promise.all([
      hasOpenTicketForTool(toolId),
      getComponentsForMaintenanceCycle(toolId, session!.user.ownerId).catch(() => null),
    ]);

    return NextResponse.json({
      has_open_ticket: hasOpen,
      components: systemData?.components ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const body = await req.json();
    const { fk_tool_id, issue_description, priority, selected_component_ids } = body;

    if (!fk_tool_id || typeof fk_tool_id !== 'number') {
      return NextResponse.json({ status: 'ERROR', message: 'fk_tool_id is required' }, { status: 400 });
    }

    if (!issue_description || typeof issue_description !== 'string' || !issue_description.trim()) {
      return NextResponse.json({ status: 'ERROR', message: 'issue_description is required' }, { status: 400 });
    }

    try {
      await assertNoOpenTicketForTool(fk_tool_id);
    } catch (err: any) {
      return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 409 });
    }

    const ticket_id = await createTicket({
      fk_owner_id: session!.user.ownerId,
      fk_tool_id,
      type: 'STANDARD',
      priority,
      opened_by: session!.user.fullname,
      fk_user_id: session!.user.userId,
      note: issue_description.trim(),
    });

    // Mark system as NOT_OPERATIONAL
    await setSystemOperationalStatus(fk_tool_id, 'NOT_OPERATIONAL');

    const componentIds: number[] = Array.isArray(selected_component_ids) ? selected_component_ids : [];
    if (componentIds.length > 0) {
      await setComponentsOperationalStatus(componentIds, 'NOT_OPERATIONAL');
    }

    const systemData = await getComponentsForMaintenanceCycle(fk_tool_id, session!.user.ownerId).catch(() => null);
    const systemCode = (systemData as any)?.tool_code ?? `System #${fk_tool_id}`;
    const notifTitle = `Issue Reported — ${systemCode}`;
    const notifMsg = `${session!.user.fullname} reported an issue on ${systemCode}: ${issue_description.trim().slice(0, 120)}`;
    sendNotificationToRoles(
      session!.user.ownerId,
      ['ADMIN', 'OPM'],
      notifTitle,
      notifMsg,
      '/systems/maintenance-tickets'
    ).catch(() => { });

    return NextResponse.json({ status: 'OK', ticket_id });
  } catch (err: any) {
    console.error('[POST /api/operation/report-issue]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}
