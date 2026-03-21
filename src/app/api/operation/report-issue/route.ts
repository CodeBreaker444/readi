import { createTicket } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();

    if (!session?.user) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { fk_tool_id, issue_description, components, priority } = body;

    if (!fk_tool_id || typeof fk_tool_id !== 'number') {
      return NextResponse.json({ status: 'ERROR', message: 'fk_tool_id is required' }, { status: 400 });
    }

    if (!issue_description || typeof issue_description !== 'string' || !issue_description.trim()) {
      return NextResponse.json({ status: 'ERROR', message: 'issue_description is required' }, { status: 400 });
    }

    const ticket_id = await createTicket({
      fk_owner_id: session.user.ownerId,
      fk_tool_id,
      components: Array.isArray(components) && components.length > 0 ? components : undefined,
      type: 'STANDARD',
      priority: priority,
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
