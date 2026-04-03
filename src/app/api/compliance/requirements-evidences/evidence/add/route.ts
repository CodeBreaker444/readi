import { addEvidence } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const AddEvidenceSchema = z.object({
  requirement_id: z.number().int().positive(),
  evidence_type: z.enum(['DOC', 'RECORD', 'AUDIT', 'LINK']),
  evidence_description: z.string().max(500).nullable().optional(),
  file_path: z.string().max(1000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const body = await req.json();
    const parsed = AddEvidenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;
    const userId = session!.user.id;
    if (!ownerId) {
      return NextResponse.json({ code: 0, error: 'Owner not found in session' }, { status: 403 });
    }

    const created = await addEvidence({
      ...parsed.data,
      owner_id: ownerId,
      submitted_by_user_id: Number(userId),
    });

    return NextResponse.json({ code: 1, message: 'Evidence added', data: created });
  } catch (err) {
    console.error('[evidence/add] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
