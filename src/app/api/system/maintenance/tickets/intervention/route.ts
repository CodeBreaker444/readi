import { endIntervention, getTicketAssignee, startIntervention } from '@/backend/services/system/maintenance-ticket';
import { userHasSubRole } from '@/lib/auth/api-auth';
import { requireAuth } from '@/lib/auth/api-auth';
import { roleHasPermission } from '@/lib/auth/roles';
import { forbidden, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const interventionSchema = z.object({
  ticket_id: z.coerce.number(),
  action: z.enum(['start', 'end']),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const validation = interventionSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { ticket_id, action } = validation.data;
    const userId = session!.user.userId;
    const role = session!.user.role;

    // RM/ADMIN/SUPERADMIN can log interventions directly; PIC needs PIC_TECHNICIAN subrole + assignment
    const hasConfig = roleHasPermission(role, 'view_config');
    if (!hasConfig) {
      const [assignee, hasTechSubRole] = await Promise.all([
        getTicketAssignee(ticket_id),
        userHasSubRole(userId, 'PIC_TECHNICIAN'),
      ]);
      if (assignee !== userId || !hasTechSubRole) {
        return forbidden(E.PX001);
      }
    }

    if (action === 'start') {
      await startIntervention(ticket_id, userId, session!.user.email ?? '');
    } else {
      await endIntervention(ticket_id, userId, session!.user.email ?? '');
    }

    return NextResponse.json({ status: 'OK' });
  } catch (err: any) {
    if (err?.message && typeof err.message === 'string' && !err.message.includes('prisma')) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[POST /api/system/maintenance/tickets/intervention]', err);
    return internalError(E.SV001, err);
  }
}
