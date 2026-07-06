import { logEvent } from '@/backend/services/auditLog/audit-log';
import { assignTicket, getTechnicianName } from '@/backend/services/system/maintenance-ticket';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const assignTicketSchema = z.object({
  ticket_id: z.number(),
  assigned_to: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
      const { session, error } = await requirePermission('view_config');
      if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_maintenance_tickets', 'edit');
    if (featureError) return featureError;

    const validation = assignTicketSchema.safeParse(body);
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const techName = await getTechnicianName(validation.data.assigned_to);

    await assignTicket({
      ticket_id: validation.data.ticket_id,
      assigned_to: validation.data.assigned_to,
      technician_name: techName,
    });

    logEvent({
      eventType: 'UPDATE',
      entityType: 'maintenance_ticket',
      entityId: validation.data.ticket_id,
      description: `Assigned maintenance ticket #${validation.data.ticket_id} to ${techName}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId: session!.user.ownerId,
    });

    return NextResponse.json({ status: 'OK' });
  } catch (err) {
    console.error('[POST /api/maintenance/tickets/assign]', err);
    return internalError(E.SV001, err);
  }
}
