/**
 * Shared helpers for /api/cron/* jobs.
 * Each job lives in its own *-jobs.ts file and returns the JSON body its route responds with.
 */
import { prisma } from '@/lib/prisma';

/** Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. Missing secret = always reject. */
export function isAuthorizedCronRequest(authHeader: string | null, cronSecret: string | undefined): boolean {
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function getActiveOwnerIds(): Promise<number[]> {
  const owners = await prisma.owner.findMany({
    where: { owner_active: 'Y' },
    select: { owner_id: true },
  });
  return owners.map((o) => o.owner_id);
}

/**
 * Runs `task` for every owner. One owner failing never stops the others.
 * `failureLabel` completes: "[Cron] Failed to <failureLabel> for owner <id>:".
 */
export async function runForEachOwner(
  ownerIds: number[],
  failureLabel: string,
  task: (ownerId: number) => Promise<void>
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  for (const ownerId of ownerIds) {
    try {
      await task(ownerId);
      processed++;
    } catch (error) {
      console.error(`[Cron] Failed to ${failureLabel} for owner ${ownerId}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}
