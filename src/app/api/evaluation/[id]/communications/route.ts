import { getCommunicationsByEvaluation } from '@/backend/services/planning/evaluation-detail';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
    id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requirePermission('view_planning_advanced');
        if (error) return error;

        const { id: evaluationId } = paramsSchema.parse(await params);

        const data = await getCommunicationsByEvaluation(
            session!.user.ownerId,
            evaluationId,
        );

        return NextResponse.json({ code: 1, message: 'Success', data, dataRows: data.length });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json(
                { code: 0, errors: err.flatten().fieldErrors },
                { status: 400 },
            );
        }
        return internalError(E.AU002, err);
    }
}
