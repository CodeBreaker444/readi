import { updateMissionCommunicationTask } from '@/backend/services/operation/mission-task-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  mission_id: z.coerce.number().int().positive(),
  task_id: z.coerce.number().int().positive(),
  communication_id: z.coerce.number().int().positive(),
  communication_message: z.string().min(1),
  communication_to: z.coerce.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, message: parsed.error.issues[0].message }, { status: 400 });
    }

    await updateMissionCommunicationTask({
      missionId: parsed.data.mission_id,
      ownerId: session!.user.ownerId,
      taskId: parsed.data.task_id,
      communicationId: parsed.data.communication_id,
      communicationMessage: parsed.data.communication_message,
      toUserId: parsed.data.communication_to,
      userId: session!.user.userId,
      userEmail: session!.user.email,
    });

    return NextResponse.json({ code: 1, message: 'Communication sent and task updated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
