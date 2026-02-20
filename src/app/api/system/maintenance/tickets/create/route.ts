import { createTicket } from '@/backend/services/system/maintenance-ticket';
import { CreateTicketPayload } from '@/config/types/maintenance';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const createTicketSchema = z.object({
  fk_tool_id: z.number(),
  issue_description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body: CreateTicketPayload = await req.json();

    const session = await getUserSession();

    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }   

    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          code: 0,
          message: 'Validation failed',
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }
    const userId= session.user.userId
    const ownerId = session.user.ownerId
    const ticket_id = await createTicket({...body, fk_user_id: userId, fk_owner_id: ownerId});

    return NextResponse.json({ status: 'OK', ticket_id });

  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/create]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}