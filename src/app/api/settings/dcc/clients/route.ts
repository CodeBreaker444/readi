import { logEvent } from '@/backend/services/auditLog/audit-log';
import { MISSION_SCOPES } from '@/backend/services/mission/dcc-settings-service';
import {
  deleteClientEndpoint,
  getClientLabel,
  listClientEndpoints,
  upsertClientEndpoint,
} from '@/backend/services/mission/dcc-client-status-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { assertSafeCallbackUrl, callbackUrlFormatError } from '@/lib/safe-url';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const httpUrl = z
  .string()
  .url('Must be a valid URL')
  .max(500)
  .superRefine((v, ctx) => {
    const msg = callbackUrlFormatError(v);
    if (msg) ctx.addIssue({ code: 'custom', message: msg });
  });

// undefined = leave unchanged, null/'' = clear
const optionalUrl = z.union([httpUrl, z.literal('').transform(() => null), z.null()]).optional();

// Readi appends DCC paths (/dcc/missions/...) to the callback URL, so a query string or
// fragment would end up in the middle of the address. The status URL is posted to as is.
const callbackUrl = httpUrl.superRefine((v, ctx) => {
  try {
    const u = new URL(v);
    if (u.search || u.hash) ctx.addIssue({ code: 'custom', message: 'Callback URL must not contain a query string or #fragment' });
  } catch {
    /* already reported by httpUrl */
  }
});
const optionalCallbackUrl = z.union([callbackUrl, z.literal('').transform(() => null), z.null()]).optional();

const SaveSchema = z
  .object({
    client_id: z.number().int().positive(),
    status_url: optionalUrl,
    callback_url: optionalCallbackUrl,
    mission_scope: z.enum(MISSION_SCOPES).optional(),
    active: z.boolean().default(true),
  })
  // An integration with no address at all would receive nothing, so '' / null for both is rejected too.
  .refine((v) => Boolean(v.status_url) || Boolean(v.callback_url), {
    message: 'Provide a status URL, a callback URL, or both',
  });

const DeleteSchema = z.object({ client_id: z.number().int().positive() });

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;
    const data = await listClientEndpoints(session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = SaveSchema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    for (const url of [parsed.data.status_url, parsed.data.callback_url]) {
      if (!url) continue;
      try {
        await assertSafeCallbackUrl(url);
      } catch (e: any) {
        return NextResponse.json({ code: 0, error: e.message }, { status: 400 });
      }
    }

    const user = session!.user;
    const result = await upsertClientEndpoint(
      user.ownerId,
      parsed.data.client_id,
      { statusUrl: parsed.data.status_url, callbackUrl: parsed.data.callback_url, missionScope: parsed.data.mission_scope },
      parsed.data.active,
    );
    if (!result) return apiError(E.VL002, 404);

    const clientLabel = await getClientLabel(user.ownerId, parsed.data.client_id);
    logEvent({
      eventType: result.created ? 'CREATE' : 'UPDATE',
      entityType: 'dcc_client_endpoint',
      entityId: parsed.data.client_id,
      description: `DCC integration for client ${clientLabel} ${result.created ? 'created' : 'updated'}`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
      metadata: { missionScope: parsed.data.mission_scope },
    });

    // The key is only ever returned here (first save) and on rotation.
    return NextResponse.json({
      code: 1,
      message: 'Client integration saved',
      ...(result.apiKey ? { api_key: result.apiKey } : {}),
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const parsed = DeleteSchema.safeParse(await req.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const user = session!.user;
    const clientLabel = await getClientLabel(user.ownerId, parsed.data.client_id);
    await deleteClientEndpoint(user.ownerId, parsed.data.client_id);
    logEvent({
      eventType: 'DELETE',
      entityType: 'dcc_client_endpoint',
      entityId: parsed.data.client_id,
      description: `DCC integration for client ${clientLabel} removed`,
      userId: user.userId,
      userName: user.fullname,
      userEmail: user.email,
      userRole: user.role,
      ownerId: user.ownerId,
    });
    return NextResponse.json({ code: 1, message: 'Client status URL removed' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
