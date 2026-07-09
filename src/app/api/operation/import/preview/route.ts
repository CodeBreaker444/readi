import { previewUploadedFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { error } = await requirePermission('view_operations');
    if (error) return error;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ code: 0, message: 'file is required' }, { status: 400 });
    }

    const preview = await previewUploadedFlightLog(file);
    return NextResponse.json({ code: 1, ...preview });
  } catch (err) {
    console.error('[operation/import/preview] POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}
