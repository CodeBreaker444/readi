import { getDocumentHistory } from '@/backend/services/document/document-service';
import { internalError, zodError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
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
      return zodError(E.VL001, parsed.error);
    }
    const items = await getDocumentHistory(parsed.data);
    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('[document_history]', error);
    return internalError(E.AU002, error);
  }
}