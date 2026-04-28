import { getComponentFlightLogs } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const componentId = Number(id);
    if (!componentId) {
      return NextResponse.json({ code: 0, message: 'Invalid component id' }, { status: 400 });
    }

    const result = await getComponentFlightLogs(componentId, session!.user.ownerId);
    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
