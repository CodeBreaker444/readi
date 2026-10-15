import { logEvent } from '@/backend/services/auditLog/audit-log';
import {
  createEmailNotification,
  emailNotificationInputSchema,
  listContacts,
  listEmailNotifications,
} from '@/backend/services/logbook/event-notification-service';
import { getClientOptions } from '@/backend/services/operation/operation-service';
import { zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const [notifications, contacts, clients] = await Promise.all([
      listEmailNotifications(ownerId),
      listContacts(ownerId),
      getClientOptions(ownerId),
    ]);
    return NextResponse.json({ code: 200, notifications, contacts, clients });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = emailNotificationInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const id = await createEmailNotification(user.ownerId, user.userId, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'event_email_notification',
      entityId: id,
      description: `Created event email notification "${parsed.data.name}"`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200, notification_id: id }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
