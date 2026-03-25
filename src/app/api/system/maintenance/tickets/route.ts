import { getTicketList } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
      const { session, error } = await requirePermission('view_config');
      if (error) return error;
      
    const owner_id = session!.user.ownerId;
    const tool_id_param = req.nextUrl.searchParams.get('tool_id');
    const tool_id = tool_id_param ? Number(tool_id_param) : undefined;

    const tickets = await getTicketList(owner_id, tool_id);
    return NextResponse.json({ status: 'OK', tickets });
  } catch (err: any) {
    console.error('[GET /api/maintenance/tickets]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}