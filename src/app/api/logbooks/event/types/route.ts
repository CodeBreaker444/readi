import { logEvent } from '@/backend/services/auditLog/audit-log';
import { createEventType, eventTypeInputSchema, listEventTypes } from '@/backend/services/logbook/event-type-service';
import { zodError } from '@/lib/api-error';
import { requireAuth, requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

/** The company's event types. Any signed-in user may read them (pilots report with them, clients filter by them). */
export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;
    return NextResponse.json({ code: 200, types: await listEventTypes(session!.user.ownerId) });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = eventTypeInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const created = await createEventType(user.ownerId, user.userId, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'pilot_event_type',
      entityId: created.event_type_id,
      description: `Created event type "${parsed.data.type_name}"`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200, ...created }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
