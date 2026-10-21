import { logEvent } from '@/backend/services/auditLog/audit-log';
import { addSupportMedia, addSupportMediaSchema, describeEventForAudit } from '@/backend/services/logbook/event-logbook-service';
import { dispatchEventSupportMedia } from '@/backend/services/logbook/event-webhook-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { after, NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Adds supporting images/videos to a reported event. No emails; webhooks get an `event.updated` (support_media). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'edit');
    if (error) return error;

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const parsed = addSupportMediaSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const { tool_id, event_type_label, attachment_ids } = await addSupportMedia(user, eventId, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'pilot_event',
      entityId: eventId,
      description: `Added ${attachment_ids.length} supporting media to event ${await describeEventForAudit(tool_id, event_type_label)}`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });

    after(() => dispatchEventSupportMedia(eventId, attachment_ids));

    return NextResponse.json({ code: 200, attachment_ids }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
