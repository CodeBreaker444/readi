import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteEventType, eventTypeInputSchema, updateEventType } from '@/backend/services/logbook/event-type-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

/** Renames a type. The code stays the same, so existing events keep pointing at it. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const parsed = eventTypeInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const before = await updateEventType(user.ownerId, id, parsed.data);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'pilot_event_type',
      entityId: id,
      description: `Renamed event type "${before.type_name}" to "${parsed.data.type_name}"`,
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
    const removed = await deleteEventType(user.ownerId, id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'pilot_event_type',
      entityId: id,
      description: `Deleted event type "${removed.type_name}"`,
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
