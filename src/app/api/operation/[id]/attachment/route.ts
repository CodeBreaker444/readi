import { listOperationAttachments, uploadOperationAttachment } from '@/backend/services/operation/operation-service';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 20 * 1024 * 1024;  

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const attachments = await listOperationAttachments(id);
    return NextResponse.json(attachments);
  } catch (err) {
    console.error('[GET /api/operation/:id/attachments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const id = parseInt((await params).id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 413 });
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const result = await uploadOperationAttachment(id, file, description, 'web');
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('[POST /api/operation/:id/attachments]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}