import { logEvent } from '@/backend/services/auditLog/audit-log';
import { getClientLabel, rotateClientEndpointKey } from '@/backend/services/mission/dcc-client-status-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Schema = z.object({ client_id: z.number().int().positive() });

/** Issues a new API key for a client's integration. The old key stops being sent immediately. */
export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const result = await rotateClientEndpointKey(user.ownerId, parsed.data.client_id);
    if (!result) return apiError(E.VL002, 404);

    const clientLabel = await getClientLabel(user.ownerId, parsed.data.client_id);
    logEvent({
      eventType: 'UPDATE',
      entityType: 'dcc_client_endpoint',
      entityId: parsed.data.client_id,
      description: `DCC integration key for client ${clientLabel} rotated`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });

    return NextResponse.json({ code: 1, api_key: result.apiKey, api_key_last6: result.last6 });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
