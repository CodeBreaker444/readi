import { getComplianceRequirements } from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

const QuerySchema = z.object({
  area: z.string().optional(),
  requirement_status: z
    .enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE'])
    .optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const raw = {
      area: searchParams.get('area') ?? undefined,
      requirement_status: searchParams.get('requirement_status') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    };

    const parsed = QuerySchema.safeParse(raw);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return apiError(E.AU003, 403);
    }

    const result = await getComplianceRequirements({
      owner_id: ownerId,
      requirement_type: parsed.data.area,
      requirement_status: parsed.data.requirement_status,
      q: parsed.data.q,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    return NextResponse.json({ code: 1, message: 'Success', ...result });
  } catch (error: any) {
    console.error('[requirements-evidences/list] error:', error);
    return internalError(E.AU002, error);
  }
}
