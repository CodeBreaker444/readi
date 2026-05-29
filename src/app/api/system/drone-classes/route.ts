import { createDroneClass, getDroneClasses } from '@/backend/services/system/drone-class-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    const classes = await getDroneClasses(session!.user.ownerId);
    return NextResponse.json({ code: 1, data: classes });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;
    const { class_value, class_label } = await req.json();
    if (!class_value || !class_label) return NextResponse.json({ code: 0, message: 'class_value and class_label required' }, { status: 400 });
    const created = await createDroneClass(session!.user.ownerId, class_value, class_label);
    return NextResponse.json({ code: 1, data: created });
  } catch (err: any) {
    return NextResponse.json({ code: 0, message: err.message ?? 'Failed' }, { status: 400 });
  }
}
