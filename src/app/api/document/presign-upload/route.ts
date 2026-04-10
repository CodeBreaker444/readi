import { getPresignedUploadUrl } from '@/lib/s3Client';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
];

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_repository');
    if (error) return error;

    const { file_name, content_type, file_size } = await req.json();

    if (!file_name || !content_type) {
      return NextResponse.json({ code: 0, error: 'file_name and content_type are required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(content_type)) {
      return NextResponse.json({ code: 0, error: `File type not allowed: ${content_type}` }, { status: 400 });
    }
    if (file_size && file_size > MAX_BYTES) {
      return NextResponse.json({ code: 0, error: 'File exceeds 25 MB limit' }, { status: 400 });
    }

    const safe = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3_key = `documents/${Date.now()}_${safe}`;

    const upload_url = await getPresignedUploadUrl(s3_key, content_type, 300);

    return NextResponse.json({ code: 1, upload_url, s3_key });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, error: message }, { status: 500 });
  }
}
