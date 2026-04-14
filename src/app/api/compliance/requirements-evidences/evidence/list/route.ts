import { listEvidenceByRequirement } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { apiError } from '@/lib/api-error';

const QuerySchema = z.object({
  requirement_id: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ requirement_id: searchParams.get('requirement_id') });
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return apiError(E.AU003, 403);
    }

    const data = await listEvidenceByRequirement(parsed.data.requirement_id, ownerId);
    return NextResponse.json({ code: 1, message: 'Success', data });
  } catch (error: any) {
    console.error('[evidence/list] error:', error);
    return internalError(E.AU002, error);
  }
}
