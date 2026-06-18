import { getTicketEvents } from '@/backend/services/system/maintenance-ticket';
import { requireAnyPermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const getEventsSchema = z.object({
  ticket_id: z.string(),
});

export async function GET(req: NextRequest) {
  const { error } = await requireAnyPermission('view_config', 'view_maintenance_tickets');
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const ticket_id = searchParams.get('ticket_id');

    const validation = getEventsSchema.safeParse({ ticket_id });
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const events = await getTicketEvents(Number(ticket_id));
    return NextResponse.json({ status: 'OK', events });
  } catch (err) {
    console.error('[GET /api/maintenance/tickets/events]', err);
    return internalError(E.SV001, err);
  }
}
