import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { runMaintenanceAlertsJob } from '@/backend/services/cron/maintenance-cron-jobs';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runMaintenanceAlertsJob());
  } catch (error) {
    console.error('[Cron] Maintenance alerts check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
