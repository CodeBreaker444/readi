import { deleteOperationAttachment } from '@/backend/services/operation/operation-service';
import { NextRequest, NextResponse } from 'next/server';

interface Params {
  params: Promise<{ id: string; attachmentId: string }>;
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id, attachmentId } = await params;
    const opId = parseInt(id, 10);
    const attId = parseInt(attachmentId, 10);

    if (isNaN(opId) || isNaN(attId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    await deleteOperationAttachment(attId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[DELETE /api/operation/:id/attachments/:attachmentId]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}