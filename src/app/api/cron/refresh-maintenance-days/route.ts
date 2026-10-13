import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { runRefreshMaintenanceDaysJob } from '@/backend/services/cron/maintenance-cron-jobs';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runRefreshMaintenanceDaysJob());
  } catch (error) {
    console.error('[Cron] Maintenance days refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
