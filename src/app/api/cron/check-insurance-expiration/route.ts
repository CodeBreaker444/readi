import { prisma } from '@/lib/prisma';
import {
  findExpiringInsurancesForOwner,
  sendInsuranceExpiryNotifications,
} from '@/backend/services/system/dflight-insurance-notification';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const owners = await prisma.owner.findMany({
      where: { owner_active: 'Y' },
      select: { owner_id: true },
    });

    let processedOwners = 0;
    let totalExpiring = 0;
    let errors = 0;

    for (const { owner_id } of owners) {
      try {
        const expiring = await findExpiringInsurancesForOwner(owner_id);
        totalExpiring += expiring.length;
        await sendInsuranceExpiryNotifications(owner_id, expiring);
        processedOwners++;
      } catch (error) {
        console.error(`[Cron] Failed to send insurance expiry notifications for owner ${owner_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Insurance expiration check completed',
      ownersChecked: owners.length,
      processedOwners,
      totalExpiring,
      errors,
    });
  } catch (error) {
    console.error('[Cron] Insurance expiration check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
