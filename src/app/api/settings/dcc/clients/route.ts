import {
  deleteClientEndpoint,
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

const SaveSchema = z
  .object({
    client_id: z.number().int().positive(),
    status_url: optionalUrl,
    callback_url: optionalUrl,
    active: z.boolean().default(true),
  })
  .refine((v) => v.status_url !== undefined || v.callback_url !== undefined, {
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

    const ok = await upsertClientEndpoint(
      session!.user.ownerId,
      parsed.data.client_id,
      { statusUrl: parsed.data.status_url, callbackUrl: parsed.data.callback_url },
      parsed.data.active,
    );
    if (!ok) return apiError(E.VL002, 404);

    return NextResponse.json({ code: 1, message: 'Client URLs saved' });
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

    await deleteClientEndpoint(session!.user.ownerId, parsed.data.client_id);
    return NextResponse.json({ code: 1, message: 'Client status URL removed' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
