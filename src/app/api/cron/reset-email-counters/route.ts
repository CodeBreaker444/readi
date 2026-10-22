import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { runResetEmailCountersJob } from '@/backend/services/cron/email-counter-cron-job';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runResetEmailCountersJob());
  } catch (error) {
    console.error('[Cron] Email counters reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
