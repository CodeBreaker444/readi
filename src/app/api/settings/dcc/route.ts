import { getDccIntegration, upsertDccIntegration } from '@/backend/services/mission/dcc-settings-service';
import { requirePermission } from '@/lib/auth/api-auth';
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
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await req.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: parsed.error.issues[0]?.message ?? 'Validation error' },
        { status: 400 },
      );
    }

    await upsertDccIntegration(
      session!.user.ownerId,
      parsed.data.display_name,
      parsed.data.callback_url,
    );

    return NextResponse.json({ code: 1, message: 'DCC integration saved' });
  } catch (err: any) {
    return NextResponse.json({ code: 0, error: err.message }, { status: 500 });
  }
}
