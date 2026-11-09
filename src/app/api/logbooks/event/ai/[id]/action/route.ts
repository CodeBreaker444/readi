import { logEvent } from '@/backend/services/auditLog/audit-log';
import { actOnAiEvent } from '@/backend/services/logbook/ai-event-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

type Params = { params: Promise<{ id: string }> };
export const aiEventActionSchema = z.object({
  action: z.enum(['acknowledged', 'resolved']),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((c) => c || null),
});
export type AiEventActionInput = z.infer<typeof aiEventActionSchema>;

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const parsed = aiEventActionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    await actOnAiEvent({ ownerId: user.ownerId, isSuperAdmin: user.role === 'SUPERADMIN' }, { userId: user.userId, email: user.email }, id, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'ai_event',
      entityId: id,
      description: `Marked AI event ${parsed.data.action}`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
