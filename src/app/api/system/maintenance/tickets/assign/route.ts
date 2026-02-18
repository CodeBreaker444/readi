import { assignTicket } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';
const assignTicketSchema = z.object({
  ticket_id: z.number(),
  assigned_to: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getUserSession();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const validation = assignTicketSchema.safeParse(body);
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

    await assignTicket({ 
      ticket_id: validation.data.ticket_id, 
      assigned_to: validation.data.assigned_to 
    });
    
    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/assign]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}