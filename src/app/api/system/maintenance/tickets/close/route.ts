import { closeTicket } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const closeTicketSchema = z.object({
  ticket_id: z.string(),
  note: z.string().optional(),
  closed_by: z.string(),
});
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = closeTicketSchema.safeParse(body);

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

     const session = await getUserSession();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }
  

    await closeTicket({ ticket_id: Number(body.ticket_id), note: body.note, closed_by: body.closed_by });
    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/close]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}