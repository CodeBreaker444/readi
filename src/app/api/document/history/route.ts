import { getDocumentHistory } from '@/backend/services/document/document-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentHistorySchema = z.object({
  document_id: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
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