import { sendTestWebhook } from '@/backend/services/logbook/event-webhook-service';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { apiError } from '@/lib/api-error';
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

    const result = await sendTestWebhook(session!.user.ownerId, id);
    return NextResponse.json({ code: 200, ...result });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
