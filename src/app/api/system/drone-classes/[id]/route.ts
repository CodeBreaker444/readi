import { deleteDroneClass, updateDroneClass } from '@/backend/services/system/drone-class-service';
import { internalError } from '@/lib/api-error';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'edit');
    if (featureError) return featureError;

    const { id } = await params;
    const { class_label } = await req.json();
    if (!class_label) return NextResponse.json({ code: 0, message: 'class_label required' }, { status: 400 });
    await updateDroneClass(session!.user.ownerId, Number(id), class_label);
    return NextResponse.json({ code: 1, message: 'Updated' });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message ?? 'Failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('systems_manage', 'delete');
    if (featureError) return featureError;

    const { id } = await params;
    await deleteDroneClass(session!.user.ownerId, Number(id));
    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
