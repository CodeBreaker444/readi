import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { sendPublishNotifications } from '@/backend/services/slot-booking/slot-booking-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ code: 1, groups_announced: await sendPublishNotifications() });
  } catch (error) {
    console.error('[Cron] Slot publish error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
