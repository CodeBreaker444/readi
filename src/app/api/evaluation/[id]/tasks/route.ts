import { getEvaluationTasks, updateEvaluationTask } from '@/backend/services/planning/evaluation-detail';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const evaluationIdParamSchema = z.object({
    id: z.coerce.number().int().positive('Invalid evaluation ID'),
});

const evaluationTaskUpdateSchema = z.object({
    task_id: z.coerce.number().int().nonnegative(),
    task_status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
});



export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getUserSession()
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const { id } = evaluationIdParamSchema.parse(await params);

        const result = await getEvaluationTasks(session.user.ownerId, id);
        return NextResponse.json({ success: true, ...result });
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

export async function PUT(
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
        const validated = evaluationTaskUpdateSchema.parse(body);

        const result = await updateEvaluationTask(session.user.ownerId, id, validated.task_id, validated.task_status);

        if (!result.success) {
            return NextResponse.json(
                { success: false, message: result.message ?? 'Task update failed' },
                { status: 422 },
            );
        }

        return NextResponse.json({ success: true });
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