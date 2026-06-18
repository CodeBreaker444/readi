import { getDFlightIntegration, upsertDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SaveSchema = z.object({
  base_url: z.string().url('Must be a valid URL').max(500),
  username: z.string().min(1, 'Username is required').max(255),
  password: z.string().min(1, 'Password is required').max(500),
  client_id: z.string().min(1, 'Client ID is required').max(255),
  easa_operator_code: z.string().max(255).nullable().optional(),
});

const KEEP_SENTINEL = '__KEEP__';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const integration = await getDFlightIntegration(session!.user.ownerId);
    if (!integration) return NextResponse.json({ code: 1, data: null });

    const { password: _, ...safe } = integration;
    return NextResponse.json({ code: 1, data: { ...safe, password_set: true } });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    let password = parsed.data.password;
    if (password === KEEP_SENTINEL) {
      const existing = await getDFlightIntegration(session!.user.ownerId);
      if (!existing) {
        return NextResponse.json({ code: 0, error: 'No existing integration found' }, { status: 400 });
      }
      password = existing.password;
    }

    await upsertDFlightIntegration(session!.user.ownerId, { ...parsed.data, password });

    return NextResponse.json({ code: 1, message: 'D-Flight integration saved' });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
