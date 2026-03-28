import { createComponentType, getComponentTypes } from '@/backend/services/system/component-type-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const types = await getComponentTypes(session!.user.ownerId);
    return NextResponse.json({ code: 1, data: types });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const { type_value, type_label } = await req.json();
    if (!type_value?.trim() || !type_label?.trim()) {
      return NextResponse.json({ code: 0, message: 'type_value and type_label are required' }, { status: 400 });
    }

    const data = await createComponentType(session!.user.ownerId, type_value, type_label);
    return NextResponse.json({ code: 1, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
