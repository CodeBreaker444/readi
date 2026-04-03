import { deleteEvidence } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
      return NextResponse.json(
        { code: 0, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return NextResponse.json({ code: 0, error: 'Owner not found in session' }, { status: 403 });
    }

    await deleteEvidence(parsed.data.evidence_id, ownerId);

    return NextResponse.json({ code: 1, message: 'Evidence deleted' });
  } catch (err) {
    console.error('[evidence/delete] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
