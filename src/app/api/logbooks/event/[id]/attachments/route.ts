import { getEventAttachmentUrls } from '@/backend/services/logbook/event-logbook-service';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { apiError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'create');
    if (error) return error;

    const eventId = Number((await params).id);
    if (!Number.isInteger(eventId)) return apiError(E.VL002);

    const data = await getEventAttachmentUrls(session!.user, eventId);
    return NextResponse.json({ code: 200, data });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
