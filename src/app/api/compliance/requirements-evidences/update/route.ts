import { updateComplianceRequirement } from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateSchema = z.object({
  requirement_id: z.number().int().positive(),
  requirement_code: z.string().min(1).max(50).optional(),
  requirement_title: z.string().min(1).max(300).optional(),
  requirement_type: z.string().max(100).nullable().optional(),
  regulatory_body: z.string().max(255).nullable().optional(),
  requirement_status: z
    .enum(['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE'])
    .optional(),
  review_frequency: z.number().int().min(1).max(5).nullable().optional(),
  next_review_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .nullable()
    .optional(),
  requirement_description: z.string().max(2000).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_compliance');
    if (error) return error;

    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
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

    const updated = await updateComplianceRequirement({
      owner_id: ownerId,
      ...parsed.data,
    });

    return NextResponse.json({ code: 1, message: 'Requirement updated', data: updated });
  } catch (err) {
    console.error('[requirements-evidences/update] error:', err);
    return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
  }
}
