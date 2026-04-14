import { uploadAttachment } from '@/backend/services/system/maintenance-ticket';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const uploadSchema = z.object({
  ticket_id: z.string().min(1),
  file: z.instanceof(File),
  attachment_desc: z.string().optional(),
});

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const formData = await req.formData();

    const validation = uploadSchema.safeParse({
      ticket_id: formData.get('ticket_id'),
      file: formData.get('file'),
      attachment_desc: formData.get('attachment_desc')?.toString() ?? '',
    });

    if (!validation.success) {
      return zodError(E.VL001, validation.error);
    }

    const { ticket_id, file, attachment_desc } = validation.data;

    if (file.size > MAX_SIZE_BYTES) {
      return apiError(E.VL007, 413);
    }

    const result = await uploadAttachment(
      Number(ticket_id),
      file,
      attachment_desc ?? '',
      'web',
      session!.user.userId
    );

    return NextResponse.json({
      status: 'OK',
      file_key: result.file_key,
      s3_url: result.s3_url,
    });

  } catch (err) {
    console.error('[POST /api/system/maintenance/tickets/upload]', err);
    return internalError(E.SV001, err);
  }
}

export const config = {
  api: { bodyParser: false },
};
