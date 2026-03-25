import { assertNoOpenTicketForTool, createTicket, hasOpenTicketForTool } from '@/backend/services/system/maintenance-ticket';
import { getComponentsForMaintenanceCycle } from '@/backend/services/operation/maintenance-cycle-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }
    const toolId = Number(req.nextUrl.searchParams.get('tool_id'));
    if (!toolId) return NextResponse.json({ has_open_ticket: false, components: [] });

    const [hasOpen, systemData] = await Promise.all([
      hasOpenTicketForTool(toolId),
      getComponentsForMaintenanceCycle(toolId, session.user.ownerId).catch(() => null),
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
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fk_tool_id, issue_description, priority } = body;

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
      fk_owner_id: session.user.ownerId,
      fk_tool_id,
      type: 'STANDARD',
      priority,
      opened_by: session.user.fullname,
      fk_user_id: session.user.userId,
      note: issue_description.trim(),
    });

    return NextResponse.json({ status: 'OK', ticket_id });
  } catch (err: any) {
    console.error('[POST /api/operation/report-issue]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}
