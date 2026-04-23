import { supabase } from '@/backend/database/database';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  task_code:  z.string().min(1),
  task_name:  z.string().min(1),
  to_user_id: z.number().int().positive(),
  message:    z.string().min(1),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const missionId = Number((await params).id);
    if (!missionId) {
      return NextResponse.json({ code: 0, message: 'Invalid mission ID' }, { status: 400 });
    }

    const body = bodySchema.parse(await req.json());
    const fromUserId = session!.user.userId;
    const ownerId = session!.user.ownerId;

    const subject = `[Mission Assignment] ${body.task_name} — Mission #${missionId}`;

    const { error: msgErr } = await supabase.from('messages').insert({
      from_user_id:    fromUserId,
      to_user_id:      body.to_user_id,
      message_subject: subject,
      message_body:    body.message,
      message_type:    'assignment',
    });

    if (msgErr) {
      return NextResponse.json(
        { code: 0, message: `Failed to send message: ${msgErr.message}` },
        { status: 422 },
      );
    }

    await supabase.from('assignment').insert({
      fk_user_id:        body.to_user_id,
      fk_owner_id:       ownerId,
      assignment_code:   body.task_code,
      assignment_desc:   body.task_name,
      assignment_json: {
        mission_id:   missionId,
        task_code:    body.task_code,
        task_name:    body.task_name,
        from_user_id: fromUserId,
        message:      body.message,
      },
      assignment_ver:    1,
      assignment_active: 'Y',
    });

    await supabase.from('notification').insert({
      fk_user_id:           body.to_user_id,
      notification_type:    'assignment',
      notification_title:   'New Assignment',
      notification_message: subject,
      notification_data: {
        mission_id:   missionId,
        task_code:    body.task_code,
        from_user_id: fromUserId,
      },
      priority: 'normal',
    });

    return NextResponse.json({ code: 1, message: 'Assignment sent' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return NextResponse.json({ code: 0, errors: err.flatten().fieldErrors }, { status: 400 });
    }
    return internalError(E.SV001, err);
  }
}
