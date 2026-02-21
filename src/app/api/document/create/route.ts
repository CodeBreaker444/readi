import { createDocument } from '@/backend/services/document/document-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
];

 const DocumentCreateSchema = z.object({
  doc_type_id:     z.string().min(1, 'Document type is requireda').transform(Number).pipe(z.number().int().positive()),
  doc_code:        z.string().max(50).optional(),
  status:         z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'OBSOLETE']).default('DRAFT'),
  title:           z.string().min(1, "Title is required").max(255),
  confidentiality: z.enum(['INTERNAL', 'PUBLIC', 'CONFIDENTIAL', 'RESTRICTED']).default('INTERNAL'),
  owner_role:      z.string().max(150).optional(),
  effective_date:  z.string().optional().nullable(),
  expiry_date:     z.string().optional().nullable(),
  description:     z.string().max(2000).optional(),
  keywords:        z.string().max(500).optional(),
  tags:            z.string().max(1000).optional(),
  version_label:   z.string().max(20).optional(),
  change_log:      z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const session = await getUserSession();
    if (!session) {
      return NextResponse.json({ code: 0, message: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.ownerId;

    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') fields[key] = value;
    }

    const parsed = DocumentCreateSchema.safeParse(fields);
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
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo file non consentito: ${file.type}` }, { status: 400 });
    }

    const result = await createDocument(parsed.data, file as File, ownerId);
    return NextResponse.json({ code: 1, message: 'Documento creato', ...result }, { status: 201 });
  } catch (err:any) {
    if(err.message == "A document with code already exists.")
    {
      return NextResponse.json(
         { code: 0, error: err.message || 'Internal server error' }, 
         { status: 400 } 
       );

    }
    console.error('[document_create]', err);
    return NextResponse.json(
      { code: 0, error: err.message || 'Internal server error' }, 
      { status: 500 } 
    );  

  }
}