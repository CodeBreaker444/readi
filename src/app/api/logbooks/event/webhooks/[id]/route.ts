import { deleteWebhook, updateWebhook, webhookInputSchema } from '@/backend/services/logbook/event-webhook-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { apiError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const parsed = webhookInputSchema.partial().safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    await updateWebhook(user.ownerId, id, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'event_webhook_config',
      entityId: id,
      description: 'Updated event webhook',
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const user = session!.user;
    await deleteWebhook(user.ownerId, id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'event_webhook_config',
      entityId: id,
      description: 'Deleted event webhook',
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
