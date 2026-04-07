import { deleteDocType, updateDocType } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const updateSchema = z.object({
  doc_type_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const { id } = await params;
    const typeId = parseInt(id);
    if (isNaN(typeId)) return NextResponse.json({ code: 0, error: 'Invalid id' }, { status: 400 });
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 0, error: parsed.error.issues[0].message }, { status: 400 });
    }
    const data = await updateDocType(typeId, parsed.data, session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const { id } = await params;
    const typeId = parseInt(id);
    if (isNaN(typeId)) return NextResponse.json({ code: 0, error: 'Invalid id' }, { status: 400 });
    await deleteDocType(typeId, session!.user.ownerId);
    return NextResponse.json({ code: 1 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, error: message }, { status: 500 });
  }
}
