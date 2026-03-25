import { logEvent } from '@/backend/services/auditLog/audit-log';
import { closeTicket } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const closeTicketSchema = z.object({
  ticket_id: z.coerce.number(), 
  note: z.string().optional(),
  closed_by: z.string().optional(), 
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

    const validation = closeTicketSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        code: 0,
        message: 'Validation failed',
        errors: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    await closeTicket({
      ticket_id: validation.data.ticket_id,
      note: validation.data.note,
      closed_by: Number(session!.user.userId)
    });

    logEvent({
      eventType: 'UPDATE',
      entityType: 'maintenance_ticket',
      entityId: validation.data.ticket_id,
      description: `Closed maintenance ticket #${validation.data.ticket_id}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    console.error('[POST /api/maintenance/tickets/close]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}