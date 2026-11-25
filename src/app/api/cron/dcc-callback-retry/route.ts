import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { processDccOutbox } from '@/backend/services/mission/dcc-outbox-service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ code: 1, ...(await processDccOutbox()) });
  } catch (error) {
    console.error('[Cron] DCC callback retry error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
