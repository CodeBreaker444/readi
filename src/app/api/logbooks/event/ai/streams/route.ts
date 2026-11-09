import { logEvent } from '@/backend/services/auditLog/audit-log';
import { createStreamMapping, getClientEmailMap, listStreamMappings, streamMappingInputSchema } from '@/backend/services/logbook/ai-event-service';
import { listContacts } from '@/backend/services/logbook/event-notification-service';
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
    const [mappings, clients, contacts, clientEmails] = await Promise.all([
      listStreamMappings(ownerId),
      getClientOptions(ownerId),
      listContacts(ownerId),
      getClientEmailMap(ownerId),
    ]);
    return NextResponse.json({ code: 200, mappings, clients, contacts, client_emails: clientEmails });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = streamMappingInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const id = await createStreamMapping(user.ownerId, user.userId, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'ai_stream_mapping',
      entityId: id,
      description: `Added AI stream id "${parsed.data.stream_id}"`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200, mapping_id: id }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
