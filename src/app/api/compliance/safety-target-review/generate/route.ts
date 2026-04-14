import { generateTargetProposals } from '@/backend/services/compliance/compliance-target-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

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
      return zodError(E.VL001, parsed.error);
    }

    const result = await generateTargetProposals(parsed.data.months, session!.user.userId);
    return NextResponse.json({ code: 1, message: 'Success', ...result });
  } catch (error: any) {
    console.error('[safety-target-review/generate] error:', error);
    return internalError(E.AU002, error);
  }
}
