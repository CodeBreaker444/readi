import { isAuthorizedCronRequest } from '@/backend/services/cron/cron-utils';
import { refreshHotForecasts } from '@/backend/services/weather/forecast-cache';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await refreshHotForecasts());
  } catch (error) {
    console.error('[Cron] Weather forecast refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
