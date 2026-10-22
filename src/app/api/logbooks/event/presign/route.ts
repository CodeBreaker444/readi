import { createAttachmentUploadUrl } from '@/backend/services/logbook/event-logbook-service';
import { requireFeatureAccess } from '@/lib/auth/api-auth';
import { zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { eventLogbookErrorResponse } from '@/lib/event-logbook-api';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  file_name: z.string().min(1).max(255),
  content_type: z.string().min(1),
  file_size: z.number().int().positive(),
  /** 'support' restricts the file to images and videos. */
  purpose: z.enum(['attachment', 'support']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireFeatureAccess('logbook_event', 'edit');
    if (error) return error;

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return zodError(E.VL001, parsed.error);

    const result = await createAttachmentUploadUrl(session!.user, parsed.data);
    return NextResponse.json({ code: 1, ...result });
  } catch (err) {
    return eventLogbookErrorResponse(err);
  }
}
