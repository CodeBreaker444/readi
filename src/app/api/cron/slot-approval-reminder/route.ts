import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { sendApprovalDayReminders } from '@/backend/services/slot-booking/slot-booking-service';
import { NextRequest, NextResponse } from 'next/server';

/** Daily: reminds OPMs on a configured approval weekday that slot requests are waiting. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ code: 1, reminders_sent: await sendApprovalDayReminders() });
  } catch (error) {
    console.error('[Cron] Slot approval reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
