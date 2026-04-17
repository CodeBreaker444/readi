import { deleteDocType, updateDocType } from '@/backend/services/document/document-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
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
    if (isNaN(typeId)) return apiError(E.VL002, 400);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return zodError(E.VL001, parsed.error);
    }
    const data = await updateDocType(typeId, parsed.data, session!.user.ownerId);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_repository');
    if (error) return error;
    const { id } = await params;
    const typeId = parseInt(id);
    if (isNaN(typeId)) return apiError(E.VL002, 400);
    await deleteDocType(typeId, session!.user.ownerId);
    return NextResponse.json({ code: 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('cannot be deleted')) {
      return apiError(E.BL004, 409);
    }
    if (message.includes('Not found')) {
      return apiError(E.NF021, 404);
    }
    return internalError(E.SV001, err);
  }
}
