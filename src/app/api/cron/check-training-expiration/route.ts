import { NextRequest, NextResponse } from 'next/server';
import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { runTrainingExpirationJob } from '@/backend/services/cron/expiration-cron-jobs';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runTrainingExpirationJob());
  } catch (error) {
    console.error('[Cron] Training certification expiration check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
