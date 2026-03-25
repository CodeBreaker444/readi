import { fetchOperationAttachment } from '@/backend/services/operation/operation-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { error } = await requirePermission('view_operations');
  if (error) return error;

  try {
    const { id, attachmentId } = await params;
    const opId = parseInt(id, 10);
    const attId = parseInt(attachmentId, 10);
    if (isNaN(opId) || isNaN(attId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const data = await fetchOperationAttachment(attId, opId);

    const url = await getPresignedDownloadUrl(data);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[GET download URL]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}