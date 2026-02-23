import { updateDocument } from '@/backend/services/document/document-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const DocumentUpdateSchema = z.object({
  document_id:     z.number().int().positive(),
  doc_type_id:     z.number().int().positive(),
  doc_code:        z.string().max(50).optional().nullable(),
  status:          z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']),
  title:           z.string().min(1).max(255),
  confidentiality: z.enum(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED']),
  owner_role:      z.string().max(150).optional().nullable(),
  effective_date:  z.string().optional().nullable(),
  expiry_date:     z.string().optional().nullable(),
  description:     z.string().max(2000).optional().nullable(),
  keywords:        z.string().max(500).optional().nullable(),
  tags:            z.string().max(1000).optional().nullable(),
});
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const parsed = DocumentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    await updateDocument(parsed.data);
    return NextResponse.json({ code: 1, message: 'Documento aggiornato' });
  } catch (err) {
    console.error('[document_update]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}