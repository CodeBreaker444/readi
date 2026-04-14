import { deleteEvidence } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

const DeleteSchema = z.object({
  evidence_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const body = await req.json();
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return apiError(E.AU003, 403);
    }

    await deleteEvidence(parsed.data.evidence_id, ownerId);

    return NextResponse.json({ code: 1, message: 'Evidence deleted' });
  } catch (error: any) {
      console.error('[evidence/delete] error:', error);
      return internalError(E.AU002, error);
    }
}
