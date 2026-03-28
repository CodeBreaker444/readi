import { deleteComponentType, updateComponentType } from '@/backend/services/system/component-type-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { type_label } = await req.json();
    if (!type_label?.trim()) {
      return NextResponse.json({ code: 0, message: 'type_label is required' }, { status: 400 });
    }

     const id = (await params).id

    await updateComponentType(session!.user.ownerId, Number(id), type_label);
    return NextResponse.json({ code: 1, message: 'Updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const id = (await params).id

    await deleteComponentType(session!.user.ownerId, Number(id));
    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
