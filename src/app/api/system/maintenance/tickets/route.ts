import { getTicketList } from '@/backend/services/system/maintenance-ticket';
import { requireAnyPermission } from '@/lib/auth/api-auth';
import { roleHasPermission } from '@/lib/auth/roles';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAnyPermission('view_config', 'view_maintenance_tickets');
    if (error) return error;

    const owner_id = session!.user.ownerId;
    const tool_id_param = req.nextUrl.searchParams.get('tool_id');
    const tool_id = tool_id_param ? Number(tool_id_param) : undefined;

    // PIC role: scope to tickets assigned to them only
    const hasConfig = roleHasPermission(session!.user.role, 'view_config');
    const assignedToUserId = hasConfig ? undefined : session!.user.userId;

    const tickets = await getTicketList(owner_id, tool_id, assignedToUserId);
    return NextResponse.json({ status: 'OK', tickets });
  } catch (err) {
    console.error('[GET /api/maintenance/tickets]', err);
    return internalError(E.SV001, err);
  }
}
