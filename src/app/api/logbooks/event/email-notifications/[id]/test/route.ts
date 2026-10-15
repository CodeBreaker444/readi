import { sendTestEmailNotification } from '@/backend/services/logbook/event-notification-service';
import { apiError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const id = Number((await params).id);
    if (!Number.isInteger(id)) return apiError(E.VL002);

    const result = await sendTestEmailNotification(session!.user.ownerId, id);
    return NextResponse.json({ code: 200, ...result });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
