import { updateMissionChecklistTask } from '@/backend/services/operation/mission-task-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  mission_id: z.coerce.number().int().positive(),
  checklist_code: z.string().min(1),
  checklist_data: z.record(z.string(), z.unknown()),
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

    await updateMissionChecklistTask({
      missionId: parsed.data.mission_id,
      ownerId: session!.user.ownerId,
      checklistCode: parsed.data.checklist_code,
      checklistData: parsed.data.checklist_data,
      userId: session!.user.userId,
      userFullname: session!.user.fullname,
      userRole: session!.user.role,
    });

    return NextResponse.json({ code: 1, message: 'Checklist result saved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
