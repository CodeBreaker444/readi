import {
    deleteComplianceRequirement,
} from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';


const DeleteSchema = z.object({
    requirement_id: z.number().int().positive(),
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
            return apiError(E.AU003, 403);
        }

        await deleteComplianceRequirement(parsed.data.requirement_id, ownerId);

        return NextResponse.json({ code: 1, message: 'Requirement deleted' });
    } catch (error: any) {
        console.error('[compliance/delete] error:', error);
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: string }).code === '23503'
        ) {
            return NextResponse.json(
                { code: 0, error: 'This requirement has linked evidence and cannot be deleted. Remove the associated evidence first.' },
                { status: 409 }
            );
        }
        return internalError(E.AU002, error);
    }
}