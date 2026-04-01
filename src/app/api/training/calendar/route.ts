import { getTrainingCalendarEvents } from '@/backend/services/training/training-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_training');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const events = await getTrainingCalendarEvents(ownerId);
    return NextResponse.json({ code: 1, data: events });
  } catch (err: any) {
    console.error('[GET /api/training/calendar]', err);
    return NextResponse.json({ code: 0, error: err?.message ?? 'Error' }, { status: 500 });
  }
}
