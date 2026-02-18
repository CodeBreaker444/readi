import { uploadAttachment } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const uploadSchema = z.object({
  ticket_id:       z.string().min(1),
  file:            z.instanceof(File),
  attachment_desc: z.string().optional(),
});

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (
      !session?.user ||
      (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')
    ) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const validation = uploadSchema.safeParse({
      ticket_id:       formData.get('ticket_id'),
      file:            formData.get('file'),
      attachment_desc: formData.get('attachment_desc')?.toString() ?? '',
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          status: 'ERROR',
          message: 'Validation failed',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { ticket_id, file, attachment_desc } = validation.data;

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { status: 'ERROR', message: 'File exceeds 10 MB limit' },
        { status: 413 }
      );
    }

    const result = await uploadAttachment(
      Number(ticket_id),
      file,
      attachment_desc ?? '',
      'web',
      session.user.userId         
    );

    return NextResponse.json({
      status:   'OK',
      file_key: result.file_key,
      s3_url:   result.s3_url,
    });

  } catch (err: any) {
    console.error('[POST /api/system/maintenance/tickets/upload]', err);
    return NextResponse.json(
      { status: 'ERROR', message: err.message },
      { status: 500 }
    );
  }
}

export const config = {
  api: { bodyParser: false },
};