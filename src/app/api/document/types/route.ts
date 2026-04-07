import { createDocType } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const schema = z.object({
  doc_type_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  doc_type_category: z.string().min(1, 'Area is required'),
});

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = await createDocType({ ...parsed.data, owner_id: session!.user.ownerId });
    return NextResponse.json({ code: 1, data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, error: message }, { status: 500 });
  }
}
