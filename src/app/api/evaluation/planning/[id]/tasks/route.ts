import { getPlanningTasks, updatePlanningTask } from '@/backend/services/planning/planning-dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import {  apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
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
        const { session, error } = await requirePermission('view_planning')
        if (error) return error

        const { id } = planningIdParamSchema.parse(await params);
        const result = await getPlanningTasks(session!.user.ownerId, id);
        return NextResponse.json({ code: 1, message: 'Planning tasks fetched successfully', data: result.tasks, dataRows: result.tasks.length });
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ success: false, errors: err.flatten().fieldErrors }, { status: 400 });
        }
        return internalError(E.SV001, err);
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { session, error } = await requirePermission('view_planning')
        if (error) return error

        const { id } = planningIdParamSchema.parse(await params);
        const body = await req.json();
        const validated = planningTaskUpdateSchema.parse(body);
        const result = await updatePlanningTask(
            session!.user.ownerId,
            id,
            validated.task_id,
            validated.task_status,
        );
        if (!result.success) {
            return apiError(E.BL001, 422, { message: [result.message ?? ''] });
        }
        return NextResponse.json({ code: 1, message: 'Planning task updated successfully' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
