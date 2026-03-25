import { logEvent } from '@/backend/services/auditLog/audit-log';
import { createTicket } from '@/backend/services/system/maintenance-ticket';
import { CreateTicketPayload } from '@/config/types/maintenance';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const createTicketSchema = z.object({
  fk_tool_id: z.number(),
  issue_description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body: CreateTicketPayload = await req.json();

        const { session, error } = await requirePermission('view_config');
        if (error) return error;
        
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
    const userId= session!.user.userId
    const ownerId = session!.user.ownerId
    const ticket_id = await createTicket({...body, fk_user_id: userId, fk_owner_id: ownerId});

    logEvent({
      eventType: 'CREATE',
      entityType: 'maintenance_ticket',
      entityId: ticket_id,
      description: `Created maintenance ticket for system #${body.fk_tool_id}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    return NextResponse.json({ status: 'OK', ticket_id });

  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/create]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}