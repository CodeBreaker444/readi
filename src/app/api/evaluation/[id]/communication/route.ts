import { sendEvaluationCommunication } from '@/backend/services/planning/evaluation-detail';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const paramsSchema = z.object({
    id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

const bodySchema = z.object({
    to_user_id: z.number().int().positive('Invalid recipient'),
    message: z.string().min(1, 'Message is required'),
    subject: z.string().optional(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requirePermission('view_planning_advanced');
        if (error) return error;

        const { id: evaluationId } = paramsSchema.parse(await params);
        const body = await req.json();
        const validated = bodySchema.parse(body);

        const result = await sendEvaluationCommunication(
            session!.user.ownerId,
            evaluationId,
            {
                to_user_id: validated.to_user_id,
                from_user_id: session!.user.userId,
                message: validated.message,
                subject: validated.subject,
            },
        );

        if (!result.success) {
            return NextResponse.json({ code: 0, message: result.message }, { status: 422 });
        }

        return NextResponse.json({ code: 1, message: 'Communication sent' });
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
