import { getDocumentHistory } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentHistorySchema = z.object({
  document_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const { session: _session, error } = await requirePermission('view_repository');
    if (error) return error;
    const body = await req.json();
    const parsed = DocumentHistorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const items = await getDocumentHistory(parsed.data);
    return NextResponse.json({ items });
  } catch (err) {
    console.error('[document_history]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}