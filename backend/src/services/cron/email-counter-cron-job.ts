/**
 * Cron job: reset-email-counters -> runResetEmailCountersJob
 * Returns the exact JSON body the route responds with.
 */
import { prisma } from '@/lib/prisma';

/** A counter is reset when its last reset date (UTC, yyyy-mm-dd) is not today. */
export function shouldResetEmailCounter(
  lastResetDate: Date | string | null,
  now: Date
): boolean {
  const today = now.toISOString().split('T')[0];
  const resetDate = lastResetDate
    ? new Date(lastResetDate).toISOString().split('T')[0]
    : null;
  return resetDate !== today;
}

export async function runResetEmailCountersJob() {
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
    return { message: 'No active owners found', processed: 0 };
  }

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const owner of owners) {
    try {
      if (shouldResetEmailCounter(owner.daily_email_count_reset_date, new Date())) {
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

  return {
    message: 'Email counters reset completed',
    processed,
    skipped,
    errors,
    total: owners.length,
  };
}
