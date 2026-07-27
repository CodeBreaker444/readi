import { prisma } from '@/lib/prisma';

/**
 * Check if the company has reached its daily email limit
 * Returns true if limit is reached, false otherwise
 */
export async function isDailyEmailLimitReached(ownerId: number): Promise<boolean> {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      daily_email_limit: true,
      daily_email_count: true,
      daily_email_count_reset_date: true,
    },
  });

  if (!owner) {
    console.error(`[EmailLimit] Owner not found for ownerId: ${ownerId}`);
    return true; // Fail safe: don't send if owner not found
  }

  const today = new Date().toISOString().split('T')[0];
  const resetDate = owner.daily_email_count_reset_date
    ? new Date(owner.daily_email_count_reset_date).toISOString().split('T')[0]
    : null;

  // If reset date is not today, reset the counter
  if (resetDate !== today) {
    await prisma.owner.update({
      where: { owner_id: ownerId },
      data: {
        daily_email_count: 0,
        daily_email_count_reset_date: new Date(),
      },
    });
    return false;
  }

  // Check if limit is reached
  return owner.daily_email_count >= owner.daily_email_limit;
}

/**
 * Increment the daily email count for a company
 * Returns the new count
 */
export async function incrementDailyEmailCount(ownerId: number): Promise<number> {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      daily_email_count: true,
      daily_email_count_reset_date: true,
    },
  });

  if (!owner) {
    console.error(`[EmailLimit] Owner not found for ownerId: ${ownerId}`);
    return 0;
  }

  const today = new Date().toISOString().split('T')[0];
  const resetDate = owner.daily_email_count_reset_date
    ? new Date(owner.daily_email_count_reset_date).toISOString().split('T')[0]
    : null;

  // If reset date is not today, reset the counter first
  if (resetDate !== today) {
    const updated = await prisma.owner.update({
      where: { owner_id: ownerId },
      data: {
        daily_email_count: 1,
        daily_email_count_reset_date: new Date(),
      },
      select: { daily_email_count: true },
    });
    return updated.daily_email_count;
  }

  // Increment the counter
  const updated = await prisma.owner.update({
    where: { owner_id: ownerId },
    data: {
      daily_email_count: {
        increment: 1,
      },
    },
    select: { daily_email_count: true },
  });

  return updated.daily_email_count;
}

/**
 * Get the current daily email count and limit for a company
 */
export async function getDailyEmailStats(ownerId: number) {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      daily_email_limit: true,
      daily_email_count: true,
      daily_email_count_reset_date: true,
    },
  });

  if (!owner) {
    return null;
  }

  const today = new Date().toISOString().split('T')[0];
  const resetDate = owner.daily_email_count_reset_date
    ? new Date(owner.daily_email_count_reset_date).toISOString().split('T')[0]
    : null;

  // If reset date is not today, the count should be considered as 0
  const effectiveCount = resetDate === today ? owner.daily_email_count : 0;

  return {
    limit: owner.daily_email_limit,
    count: effectiveCount,
    remaining: Math.max(0, owner.daily_email_limit - effectiveCount),
    resetDate: owner.daily_email_count_reset_date,
  };
}
