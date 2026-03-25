import { getTicketEvents } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
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
      return NextResponse.json(
        {
          code: 0,
          message: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const events = await getTicketEvents(Number(ticket_id));
    return NextResponse.json({ status: 'OK', events });
  } catch (err: any) {
    console.error('[GET /api/maintenance/tickets/events]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}