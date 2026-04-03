import { approveTargetProposal } from '@/backend/services/compliance/compliance-target-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
      return NextResponse.json(
        { code: 0, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
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
  } catch (err) {
    console.error('[safety-target-review/approve] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
