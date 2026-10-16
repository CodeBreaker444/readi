import { getDefaultContactMap, listContacts } from '@/backend/services/logbook/event-notification-service';
import { getClientOptions } from '@/backend/services/operation/operation-service';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const [defaults, contacts, clients] = await Promise.all([getDefaultContactMap(ownerId), listContacts(ownerId), getClientOptions(ownerId)]);
    return NextResponse.json({ code: 200, defaults, contacts, clients });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
