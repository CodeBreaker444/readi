import { deleteComponentType, getComponentTypes, getComponentsUsingType, updateComponentType } from '@/backend/services/system/component-type-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { type_label, confirm_impact } = await req.json();
    const id = (await params).id;

    const allTypes = await getComponentTypes(session!.user.ownerId);
    const targetType = allTypes.find(t => t.type_id === Number(id));

    if (!targetType) return NextResponse.json({ code: 0, message: 'Type not found' }, { status: 404 });

    const usage = await getComponentsUsingType(session!.user.ownerId, targetType.type_value);

    if (usage.length > 0 && !confirm_impact) {
      return NextResponse.json({ 
        code: 2,  
        message: 'Impact detected', 
        usage 
      });
    }

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
    const id = (await params).id;

    await deleteComponentType(session!.user.ownerId, Number(id));
    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message }, { status: 400 });
  }
}