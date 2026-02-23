import { uploadDocumentRevision } from '@/backend/services/document/document-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentUploadRevisionSchema = z.object({
  document_id:   z.string().min(1).transform(Number).pipe(z.number().int().positive()),
  version_label: z.string().max(20).optional(),
  change_log:    z.string().max(500).optional(),
});

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const formData = await req.formData();

    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') fields[key] = value;
    }

    const parsed = DocumentUploadRevisionSchema.safeParse(fields);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'File obbligatorio' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File troppo grande (max 20 MB)' }, { status: 400 });
    }

    const result = await uploadDocumentRevision(parsed.data, file as File);
    return NextResponse.json({ code: 1, message: 'Revisione caricata', ...result });
  } catch (err) {
    console.error('[document_upload_revision]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}