import {
    getComplianceRequirements,
} from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';

const QuerySchema = z.object({
    requirement_type: z.string().optional(),
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
            requirement_type: searchParams.get('requirement_type') ?? undefined,
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
            ...parsed.data,
        });

        return NextResponse.json({ code: 1, message: 'Success', ...result });
    } catch (error: any) {
        console.error('[compliance/list] error:', error);
        return internalError(E.AU002, error);
    }
}