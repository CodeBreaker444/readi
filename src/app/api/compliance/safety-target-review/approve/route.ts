import { approveTargetProposal } from '@/backend/services/compliance/compliance-target-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

const ApproveSchema = z.object({
  proposal_id: z.number().int().positive(),
  action: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const body = await req.json();
    const parsed = ApproveSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const updated = await approveTargetProposal({
      proposal_id: parsed.data.proposal_id,
      action: parsed.data.action,
      approved_by_user_id: session!.user.userId,
      justification: parsed.data.notes,
    });

    const msg =
      parsed.data.action === 'APPROVED' ? 'Proposal approved successfully' : 'Proposal rejected';
    return NextResponse.json({ code: 1, message: msg, data: updated });
  } catch (error: any) {
    console.error('[safety-target-review/approve] error:', error);
    return internalError(E.AU002, error);
  }
}
