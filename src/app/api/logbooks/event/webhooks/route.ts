import { createWebhook, listWebhooks, webhookInputSchema } from '@/backend/services/logbook/event-webhook-service';
import { getClientOptions } from '@/backend/services/operation/operation-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const [webhooks, clients] = await Promise.all([listWebhooks(ownerId), getClientOptions(ownerId)]);
    return NextResponse.json({ code: 200, webhooks, clients });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = webhookInputSchema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const result = await createWebhook(user.ownerId, user.userId, parsed.data);

    logEvent({
      eventType: 'CREATE',
      entityType: 'event_webhook_config',
      entityId: result.webhook_id,
      description: `Created event webhook "${parsed.data.name}"`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });

    // The secret is only ever returned here and on rotation.
    return NextResponse.json({ code: 200, ...result }, { status: 201 });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
