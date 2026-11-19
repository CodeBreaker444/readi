import { getTicketExpiryRenewals } from '@/backend/services/system/maintenance-ticket-expiry';
import { requireAnyPermission } from '@/lib/auth/api-auth';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAnyPermission('view_config', 'view_maintenance_tickets');
    if (error) return error;

    const ticketId = Number(req.nextUrl.searchParams.get('ticket_id'));
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return apiError(E.VL001, 400, { ticket_id: ['ticket_id is required'] });
    }

    const renewals = await getTicketExpiryRenewals(ticketId, session!.user.ownerId);
    return NextResponse.json({ status: 'OK', renewals });
  } catch (err) {
    console.error('[GET /api/system/maintenance/tickets/expiry-renewals]', err);
    return internalError(E.SV001, err);
  }
}
