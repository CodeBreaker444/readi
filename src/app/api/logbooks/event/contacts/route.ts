import { logEvent } from '@/backend/services/auditLog/audit-log';
import { contactInputSchema, createContact, listContacts } from '@/backend/services/logbook/event-notification-service';
import { zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;
    return NextResponse.json({ code: 200, contacts: await listContacts(session!.user.ownerId) });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = contactInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const contactId = await createContact(user.ownerId, user.userId, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'event_contact',
      entityId: contactId,
      description: `Added event contact "${parsed.data.name}"`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 200, contact_id: contactId }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
