import { deleteDepartment, getDepartments, getUsersUsingDepartment, updateDepartment } from '@/backend/services/system/department-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('team_personnel', 'edit');
    if (featureError) return featureError;

    const { department_name, confirm_impact } = await req.json();
    const id = (await params).id;

    const allDepartments = await getDepartments(session!.user.ownerId);
    const target = allDepartments.find((d) => d.department_id === Number(id));
    if (!target) return NextResponse.json({ code: 0, message: 'Department not found' }, { status: 404 });

    const usage = await getUsersUsingDepartment(session!.user.ownerId, target.department_name);

    if (usage.length > 0 && !confirm_impact) {
      return NextResponse.json({
        code: 2,
        message: 'Impact detected',
        usage,
      });
    }

    await updateDepartment(session!.user.ownerId, Number(id), department_name);
    return NextResponse.json({ code: 1, message: 'Updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('team_personnel', 'delete');
    if (featureError) return featureError;

    const id = (await params).id;

    await deleteDepartment(session!.user.ownerId, Number(id));
    return NextResponse.json({ code: 1, message: 'Deleted' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
