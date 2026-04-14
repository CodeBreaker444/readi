import { getTicketEvents } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const getEventsSchema = z.object({
  ticket_id: z.string(),
});

export async function GET(req: NextRequest) {
  const { error } = await requirePermission('view_config');
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
