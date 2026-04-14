import { getDccIntegration, upsertDccIntegration } from '@/backend/services/mission/dcc-settings-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const SaveSchema = z.object({
  display_name: z.string().min(1, 'Display name is required').max(100),
  callback_url: z.string().url('Must be a valid URL').max(500),
});

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const integration = await getDccIntegration(session!.user.ownerId);
    return NextResponse.json({ code: 1, data: integration ?? null });
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
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    await upsertDccIntegration(
      session!.user.ownerId,
      parsed.data.display_name,
      parsed.data.callback_url,
    );

    return NextResponse.json({ code: 1, message: 'DCC integration saved' });
  } catch (err: any) {
    return internalError(E.SV001, err);
  }
}
