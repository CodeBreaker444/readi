import { getRevisionDownloadUrl } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_repository');
    if (error) return error;

    const { rev_id } = await req.json();
    if (!rev_id || typeof rev_id !== 'number') {
      return NextResponse.json({ code: 0, error: 'rev_id is required' }, { status: 400 });
    }

    const result = await getRevisionDownloadUrl({ rev_id });
    return NextResponse.json({ code: 1, ...result });
  } catch (err: any) {
    console.error('[presign_download]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}
