import { uploadManualFlightLog } from '@/backend/services/operation/flight-log-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const form = await req.formData();
    const missionId = Number(form.get('mission_id'));
    const file = form.get('file') as File | null;

    if (!missionId || missionId <= 0) {
      return NextResponse.json({ code: 0, message: 'mission_id is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ code: 0, message: 'file is required' }, { status: 400 });
    }

    await uploadManualFlightLog(missionId, session!.user.userId, file);
    return NextResponse.json({ code: 1, message: 'Flight log uploaded successfully' });
  } catch (err) {
    console.error('[flight-logs/upload] POST error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('too large') ? 413 : 500;
    return NextResponse.json({ code: 0, message }, { status });
  }
}
