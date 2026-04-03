import { generateTargetProposals } from '@/backend/services/compliance/compliance-target-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const QuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ months: searchParams.get('months') });
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await generateTargetProposals(parsed.data.months, session!.user.userId);
    return NextResponse.json({ code: 1, message: 'Success', ...result });
  } catch (err) {
    console.error('[safety-target-review/generate] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
