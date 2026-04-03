import { listEvidenceByRequirement } from '@/backend/services/compliance/compliance-evidence-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
      return NextResponse.json(
        { code: 0, error: 'requirement_id is required', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ownerId = session!.user.ownerId;
    if (!ownerId) {
      return NextResponse.json({ code: 0, error: 'Owner not found in session' }, { status: 403 });
    }

    const data = await listEvidenceByRequirement(parsed.data.requirement_id, ownerId);
    return NextResponse.json({ code: 1, message: 'Success', data });
  } catch (err) {
    console.error('[evidence/list] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
