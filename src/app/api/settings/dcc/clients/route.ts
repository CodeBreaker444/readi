import {
  deleteClientEndpoint,
  listClientEndpoints,
  upsertClientEndpoint,
} from '@/backend/services/mission/dcc-client-status-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SaveSchema = z.object({
  client_id: z.number().int().positive(),
  status_url: z.string().url('Must be a valid URL').max(500),
  active: z.boolean().default(true),
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

    const ok = await upsertClientEndpoint(
      session!.user.ownerId,
      parsed.data.client_id,
      parsed.data.status_url,
      parsed.data.active,
    );
    if (!ok) return apiError(E.VL002, 404);

    return NextResponse.json({ code: 1, message: 'Client status URL saved' });
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
