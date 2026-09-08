import { generateQtbReportData } from '@/backend/services/system/qtb-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { id } = await params;
    const toolId = Number(id);
    if (!toolId) {
      return NextResponse.json({ code: 0, message: 'Invalid system id' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const timezone = searchParams.get('timezone') || 'UTC';

    if (!startDate || !endDate) {
      return NextResponse.json({ code: 0, message: 'startDate and endDate are required' }, { status: 400 });
    }

    const result = await generateQtbReportData(toolId, session!.user.ownerId, startDate, endDate, timezone);
    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
