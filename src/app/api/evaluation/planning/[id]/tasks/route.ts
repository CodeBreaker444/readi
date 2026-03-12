import { getPlanningTasks, updatePlanningTask } from '@/backend/services/planning/planning-dashboard';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const planningIdParamSchema = z.object({
    id: z.coerce.number().int().positive('Invalid planning ID'),
});

const planningTaskUpdateSchema = z.object({
    task_id: z.coerce.number().int().nonnegative(),
    task_status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const { id } = planningIdParamSchema.parse(await params);
        const result = await getPlanningTasks(session.user.ownerId, id);
        return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ success: false, errors: err.flatten().fieldErrors }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: err.message ?? 'Server error' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const session = await getUserSession();
        if (!session) {
            return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
        }
        const { id } = planningIdParamSchema.parse(await params);
        const body = await req.json();
        const validated = planningTaskUpdateSchema.parse(body);
        const result = await updatePlanningTask(
            session.user.ownerId,
            id,
            validated.task_id,
            validated.task_status,
        );
        if (!result.success) {
            return NextResponse.json({ success: false, message: result.message ?? 'Task update failed' }, { status: 422 });
        }
        return NextResponse.json({ success: true });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ success: false, errors: err.flatten().fieldErrors }, { status: 400 });
        }
        return NextResponse.json({ success: false, message: err.message ?? 'Server error' }, { status: 500 });
    }
}
