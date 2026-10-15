import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  deleteEmailNotification,
  emailNotificationInputSchema,
  updateEmailNotification,
} from '@/backend/services/logbook/event-notification-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
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

    const parsed = emailNotificationInputSchema.partial().safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    await updateEmailNotification(user.ownerId, id, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'event_email_notification',
      entityId: id,
      description: 'Updated event email notification',
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
    await deleteEmailNotification(user.ownerId, id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'event_email_notification',
      entityId: id,
      description: 'Deleted event email notification',
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
