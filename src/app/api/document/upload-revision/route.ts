import { uploadDocumentRevision } from '@/backend/services/document/document-service';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const Schema = z.object({
  document_id:   z.number().int().positive(),
  s3_key:        z.string().min(1),
  file_name:     z.string().min(1),
  file_size:     z.number().int().positive(),
  version_label: z.string().max(20).optional(),
  change_log:    z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_repository');
    if (error) return error;

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }

    const { document_id, s3_key, file_name, file_size, version_label, change_log } = parsed.data;

    const result = await uploadDocumentRevision(
      { document_id, version_label, change_log },
      s3_key,
      file_name,
      file_size,
    );

    return NextResponse.json({ code: 1, message: 'Revision uploaded', ...result });
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'This version label already exists for this document.') {
      return apiError(E.DB005, 409);
    }

    console.error('[document_upload_revision]', error);
    return internalError(E.SV001, error);
  }
}
