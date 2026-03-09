import { moveEvaluationToPlanning } from '@/backend/services/planning/evaluation-detail';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const evaluationIdParamSchema = z.object({
    id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

const moveToPlanningSchema = z.object({
    client_id: z.coerce.number().int().positive(),
    planning_name: z.string().min(1).max(255),
    planning_description: z.string().max(1000).optional(),
    planning_type: z.string().max(50).optional(),
    planned_date: z.string().optional(),
});


export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const { id } = evaluationIdParamSchema.parse(await params);

        const body = await req.json();
        const validated = moveToPlanningSchema.parse(body);

        const result = await moveEvaluationToPlanning(
            session.user.ownerId,
            id,
            validated.client_id,
            {
                planning_name: validated.planning_name,
                planning_description: validated.planning_description,
                planning_type: validated.planning_type,
                planned_date: validated.planned_date,
            },
        );

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message },
                { status: 422 },
            );
        }

        return NextResponse.json({
            success: true,
            planning_id: result.planningId,
            message: result.message,
        });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json(
                { success: false, errors: err.flatten().fieldErrors },
                { status: 400 },
            );
        }
        return NextResponse.json(
            { success: false, message: err.message ?? 'Server error' },
            { status: 500 },
        );
    }
}