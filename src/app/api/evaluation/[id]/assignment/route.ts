import { sendAssignment } from '@/backend/services/planning/evaluation-detail';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const bodySchema = z.object({
  task_id:    z.number().int().nonnegative(),
  task_code:  z.string(),
  task_name:  z.string(),
  to_user_id: z.number().int().positive(),
  message:    z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requirePermission('view_planning_advanced');
    if (error) return error;

    const { id: evaluationId } = paramsSchema.parse(await params);
    const body = bodySchema.parse(await req.json());

    const result = await sendAssignment({
      evaluationId,
      ownerId:      session!.user.ownerId,
      fromUserUuid: session!.user.userId,   
      taskId:       body.task_id,
      taskCode:     body.task_code,
      taskName:     body.task_name,
      toUserId:     body.to_user_id,
      message:      body.message,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json(
        { success: false, errors: err.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error('POST /assignment route error:', err);
    return NextResponse.json(
      { success: false, message: err.message ?? 'Server error' },
      { status: 500 },
    );
  }
}