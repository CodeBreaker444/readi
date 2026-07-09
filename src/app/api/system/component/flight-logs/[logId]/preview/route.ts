import { getFlightLogGutmaPreview } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { logId } = await params;
    const id = Number(logId);
    if (!id) {
      return NextResponse.json({ success: false, message: 'Invalid log id' }, { status: 400 });
    }

    const data = await getFlightLogGutmaPreview(id, session!.user.ownerId);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'Flight log not found') {
      return NextResponse.json({ success: false, message }, { status: 404 });
    }
    if (message === 'Access denied') {
      return NextResponse.json({ success: false, message }, { status: 403 });
    }
    return internalError(E.SV001, err);
  }
}
