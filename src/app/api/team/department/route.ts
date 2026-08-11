import { createDepartment, getDepartments } from '@/backend/services/system/department-service';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const departments = await getDepartments(session!.user.ownerId);
    return NextResponse.json({ code: 1, data: departments });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('team_personnel', 'create');
    if (featureError) return featureError;

    const { department_name } = await req.json();
    if (!department_name?.trim()) {
      return NextResponse.json({ code: 0, message: 'department_name is required' }, { status: 400 });
    }

    const data = await createDepartment(session!.user.ownerId, department_name);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
