import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteAiEvent } from '@/backend/services/logbook/ai-event-service';
import { apiError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const user = session!.user;
    const deleted = await deleteAiEvent({ ownerId: user.ownerId, isSuperAdmin: user.role === 'SUPERADMIN' }, id);

    logEvent({
      eventType: 'DELETE',
      entityType: 'ai_event',
      entityId: id,
      description:
        `Deleted AI event #${id}: ${deleted.eventLabel} (${deleted.eventType})` +
        ` | Event time: ${deleted.eventTime.toISOString().slice(0, 19).replace('T', ' ')} UTC` +
        ` | Stream: ${deleted.streamId}` +
        (deleted.className ? ` | Detected: ${deleted.className}` : ''),
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
