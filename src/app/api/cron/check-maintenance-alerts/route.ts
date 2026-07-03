import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerMaintenanceAlertCheck } from '@/backend/services/system/maintenance-notification';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active owners
    const owners = await prisma.owner.findMany({
      where: { owner_active: 'Y' },
      select: { owner_id: true },
    });

    if (owners.length === 0) {
      return NextResponse.json({
        message: 'No active owners found',
        processed: 0,
      });
    }

    // Process each owner
    let processed = 0;
    let errors = 0;

    for (const owner of owners) {
      try {
        await triggerMaintenanceAlertCheck(owner.owner_id);
        processed++;
      } catch (error) {
        console.error(`[Cron] Failed to check maintenance alerts for owner ${owner.owner_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Maintenance alerts check completed',
      processed,
      errors,
      total: owners.length,
    });
  } catch (error) {
    console.error('[Cron] Maintenance alerts check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
