import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
      select: { 
        owner_id: true,
        owner_name: true,
        daily_email_count: true,
        daily_email_count_reset_date: true,
      },
    });

    if (owners.length === 0) {
      return NextResponse.json({
        message: 'No active owners found',
        processed: 0,
      });
    }

    const today = new Date().toISOString().split('T')[0];
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const owner of owners) {
      try {
        const resetDate = owner.daily_email_count_reset_date
          ? new Date(owner.daily_email_count_reset_date).toISOString().split('T')[0]
          : null;

        // Only reset if the reset date is not today
        if (resetDate !== today) {
          await prisma.owner.update({
            where: { owner_id: owner.owner_id },
            data: {
              daily_email_count: 0,
              daily_email_count_reset_date: new Date(),
              email_limit_notification_sent_date: null,
            },
          });
          console.log(`[Cron] Reset email counter for owner ${owner.owner_id} (${owner.owner_name})`);
          processed++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`[Cron] Failed to reset email counter for owner ${owner.owner_id}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Email counters reset completed',
      processed,
      skipped,
      errors,
      total: owners.length,
    });
  } catch (error) {
    console.error('[Cron] Email counters reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
