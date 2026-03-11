import { saveChecklistResult } from '@/backend/services/organization/checklist-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const postSchema = z.object({
  checklist_code: z.string().min(1),
  checklist_data: z.record(z.string(), z.unknown()),
  evaluation_id: z.coerce.number().int().positive(),
  task_id: z.coerce.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { code: 0, message: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { checklist_data, evaluation_id, task_id } = parsed.data;

    await saveChecklistResult(evaluation_id, task_id, checklist_data);

    return NextResponse.json({ code: 1, message: 'Checklist result saved' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}