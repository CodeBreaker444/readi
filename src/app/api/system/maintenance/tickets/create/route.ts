import { logEvent } from '@/backend/services/auditLog/audit-log';
import { assertNoOpenTicketForTool, createTicket, getTechnicianName, getToolCode } from '@/backend/services/system/maintenance-ticket';
import { CreateTicketPayload } from '@/config/types/maintenance';
import { requireAnyPermission, requireFeatureAccess } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const createTicketSchema = z.object({
  fk_tool_id: z.number(),
  issue_description: z.string().optional(),
  latitude:  z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body: CreateTicketPayload = await req.json();

        const { session, error } = await requireAnyPermission('view_config', 'view_maintenance_tickets');
        if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_maintenance_tickets', 'create');
    if (featureError) return featureError;

    const validation = createTicketSchema.safeParse(body);
    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    try {
      await assertNoOpenTicketForTool(body.fk_tool_id);
    } catch {
      return apiError(E.BL005, 409);
    }

    const userId= session!.user.userId
    const ownerId = session!.user.ownerId

    const techName = body.assigned_to ? await getTechnicianName(body.assigned_to) : null;

    const ticket_id = await createTicket({
      ...body,
      fk_user_id: userId,
      fk_owner_id: ownerId,
      reporter_name: session!.user.fullname,
      reporter_email: session!.user.email,
      technician_name: techName ?? undefined,
    });

    const [systemCode] = await Promise.all([
      getToolCode(body.fk_tool_id),
    ]);

    const techPart = techName ? ` — assigned to ${techName}` : '';
    const notePart = validation.data.issue_description
      ? ` — "${validation.data.issue_description.slice(0, 80)}${validation.data.issue_description.length > 80 ? '…' : ''}"`
      : '';

    logEvent({
      eventType: 'CREATE',
      entityType: 'maintenance_ticket',
      entityId: ticket_id,
      description: `Opened maintenance ticket #${ticket_id} for ${systemCode}${techPart}${notePart}`,
      userId: session!.user.userId,
      userName: session!.user.fullname,
      userEmail: session!.user.email,
      userRole: session!.user.role,
      ownerId,
    });

    return NextResponse.json({ status: 'OK', ticket_id });

  } catch (err) {
    console.error('[POST /api/maintenance/tickets/create]', err);
    return internalError(E.SV001, err);
  }
}
