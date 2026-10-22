import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteEvent, describeEventForAudit, getEventDetail, updateEvent, updateEventSchema } from '@/backend/services/logbook/event-logbook-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Full details of one event (also the target of the link in notification emails). */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'create');
    if (error) return error;

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const user = session!.user;
    const perms = await getSessionEffectivePermissions(user);
    const data = await getEventDetail(user, eventId, perms.logbook_event === 'A');
    return NextResponse.json({ code: 200, data });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

/** Edits an event. No notifications are sent again. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'edit');
    if (error) return error;

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const parsed = updateEventSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const { tool_id, event_type_label } = await updateEvent(user, eventId, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'pilot_event',
      entityId: eventId,
      description: `Edited event ${await describeEventForAudit(tool_id, event_type_label)}`,
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
    const { session, error } = await requireFeatureAccess('logbook_event', 'edit');
    if (error) return error;

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const user = session!.user;
    const removed = await deleteEvent(user, eventId);

    logEvent({
      eventType: 'DELETE',
      entityType: 'pilot_event',
      entityId: eventId,
      description: `Deleted event ${await describeEventForAudit(removed.tool_id, removed.event_type_label)}`,
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
