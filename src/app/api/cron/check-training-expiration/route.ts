import { prisma } from '@/lib/prisma';
import {
  findExpiringCertificationsForOwner,
  sendTrainingCertificationExpiryNotifications,
} from '@/backend/services/training/training-certification-notification';
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
        const expiring = await findExpiringCertificationsForOwner(owner_id);
        totalExpiring += expiring.length;
        await sendTrainingCertificationExpiryNotifications(owner_id, expiring);
        processedOwners++;
      } catch (error) {
        console.error(`[Cron] Failed to send training certification expiry notifications for owner ${owner_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Training certification expiration check completed',
      ownersChecked: owners.length,
      processedOwners,
      totalExpiring,
      errors,
    });
  } catch (error) {
    console.error('[Cron] Training certification expiration check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
