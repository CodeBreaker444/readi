import { updateRequirementStatus } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

const StatusSchema = z.object({
  requirement_id: z.number().int().positive(),
  new_status: z.enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE']),
  comment: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const body = await req.json();
    const parsed = StatusSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;
    const userId = session!.user.id;
    if (!ownerId) {
      return apiError(E.AU003, 403);
    }

    await updateRequirementStatus({
      requirement_id: parsed.data.requirement_id,
      owner_id: ownerId,
      new_status: parsed.data.new_status,
      changed_by_user_id: Number(userId),
      comment: parsed.data.comment,
    });

    return NextResponse.json({ code: 1, message: 'Status updated' });
  } catch (error: any) {
    console.error('[requirements-evidences/status] error:', error);
    return internalError(E.AU002, error);
  }
}
