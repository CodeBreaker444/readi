import { verifyFlytbaseTokenAndGetUser } from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  token: z.string().min(8).max(2048),
  orgId: z.string().min(4).max(128).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.issues },
        { status: 400 },
      );
    }

    const flytbaseUser = await verifyFlytbaseTokenAndGetUser(
      parsed.data.token,
      parsed.data.orgId,
    );
    return NextResponse.json({ success: true, flytbaseUser });
  } catch (err: any) {
    console.error('[POST /api/integrations/flytbase/verify]', err);
    const status = err.message?.includes('Invalid FlytBase') ? 422 : 500;
    return NextResponse.json({ success: false, message: err.message }, { status });
  }
}
