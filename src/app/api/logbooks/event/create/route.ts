import { createEvent, createEventSchema, describeEventForAudit } from '@/backend/services/logbook/event-logbook-service';
import { dispatchEventEmails } from '@/backend/services/logbook/event-notification-service';
import { dispatchEventCreated } from '@/backend/services/logbook/event-webhook-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { after, NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'edit');
    if (error) return error;

    const parsed = createEventSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const { event_id, event_type_label } = await createEvent(user, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'pilot_event',
      entityId: event_id,
      description: `Reported event ${await describeEventForAudit(parsed.data.tool_id, event_type_label)}`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });

    // Notify the client's webhook(s) after the response is sent; failures are recorded per delivery.
    after(() => dispatchEventCreated(event_id));
    after(() => dispatchEventEmails(event_id));

    return NextResponse.json({ code: 200, event_id }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
