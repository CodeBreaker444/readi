import { logEvent } from '@/backend/services/auditLog/audit-log';
import { defaultContactsInputSchema, setClientDefaultContacts } from '@/backend/services/logbook/event-notification-service';
import { apiError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ clientId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const clientId = Number((await params).clientId);
    if (!Number.isInteger(clientId)) return apiError(E.VL002);

    const parsed = defaultContactsInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    await setClientDefaultContacts(user.ownerId, clientId, parsed.data.contact_ids);

    logEvent({
      eventType: 'UPDATE',
      entityType: 'event_default_contact',
      entityId: clientId,
      description: `Set ${parsed.data.contact_ids.length} default event notification contact(s) for client #${clientId}`,
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
