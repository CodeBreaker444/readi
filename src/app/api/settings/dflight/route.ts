import { getDFlightIntegration, upsertDFlightIntegration } from '@/backend/services/integrations/dflight-settings-service';
import { internalError, zodError } from '@/lib/api-error';
import { requireFullAccessRole } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SaveSchema = z.object({
  base_url: z.string().max(500),
  username: z.string().min(1, 'Username is required').max(255),
  password: z.string().max(500),
  client_id: z.string().min(1, 'Client ID is required').max(255),
  easa_operator_code: z.string().max(255).nullable().optional(),
  pfx_content: z.string().nullable().optional(),
  pfx_password: z.string().nullable().optional(),
});

const KEEP_SENTINEL = '__KEEP__';

export async function GET() {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const integration = await getDFlightIntegration(session!.user.ownerId);
    if (!integration) return NextResponse.json({ code: 1, data: null });

    const { password: _, pfx_password: __, ...safe } = integration;
    return NextResponse.json({ 
      code: 1, 
      data: { 
        ...safe, 
        password_set: true,
        pfx_password_set: !!integration.pfx_password 
      } 
    });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const body = await req.json();

    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      console.log('POST /api/settings/dflight - Validation error:', parsed.error);
      return zodError(E.VL001, parsed.error);
    }

    let password = parsed.data.password;
    let pfx_password = parsed.data.pfx_password;


    if (password === KEEP_SENTINEL) {
      const existing = await getDFlightIntegration(session!.user.ownerId);
      if (!existing) {
        return NextResponse.json({ code: 0, error: 'No existing integration found' }, { status: 400 });
      }
      password = existing.password;
    }

    if (pfx_password === KEEP_SENTINEL) {
      const existing = await getDFlightIntegration(session!.user.ownerId);
      if (!existing) {
        return NextResponse.json({ code: 0, error: 'No existing integration found' }, { status: 400 });
      }
      pfx_password = existing.pfx_password;
    }


    await upsertDFlightIntegration(session!.user.ownerId, {
      ...parsed.data,
      password,
      pfx_password,
    });

    return NextResponse.json({ code: 1, message: 'D-Flight integration saved' });
  } catch (err: any) {
    console.log('POST /api/settings/dflight - Error:', err);
    return internalError(E.SV001, err);
  }
}
