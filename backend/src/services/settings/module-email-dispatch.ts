/**
 * Sends a module email through the company's daily email limit.
 *
 * Flow (identical for maintenance / operations / training):
 *   1. event enabled for the company?          (module-email-config.ts)
 *   2. resolve recipients                      (module-email-config.ts)
 *   3. daily limit reached?  -> warn admins once per day, do NOT send
 *   4. send, increment the counter
 *   5. if that send used the last slot -> warn admins once per day
 */
import { prisma } from "@/lib/prisma";
import { isDailyEmailLimitReached, incrementDailyEmailCount, getDailyEmailStats } from "@/backend/services/email/email-limit-service";
import { notifyAdminsOnEmailLimitReached, shouldNotifyEmailLimitReached, markEmailLimitNotificationSent } from "@/backend/services/email/admin-notification-service";
import { getRecipientEmails, isModuleEventEmailEnabled } from "./module-email-config";

export type EmailTemplateFn = (emails: string[], ...args: any[]) => Promise<void>;

type EmailStats = NonNullable<Awaited<ReturnType<typeof getDailyEmailStats>>>;

/** Tell the company admins the daily limit is reached (at most once per day). */
async function warnAdminsLimitReached(ownerId: number, stats: EmailStats): Promise<void> {
  if (!(await shouldNotifyEmailLimitReached(ownerId))) return;

  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: { owner_name: true },
  });
  if (!owner) return;

  await notifyAdminsOnEmailLimitReached({
    ownerId,
    ownerName: owner.owner_name,
    dailyLimit: stats.limit,
    currentCount: stats.count,
  });
  await markEmailLimitNotificationSent(ownerId);
}

export interface DispatchOptions {
  /** Extra recipients added after the configured ones (e.g. training course owner). */
  extraRecipientEmails?: (configured: string[]) => Promise<string[]>;
}

export async function dispatchModuleEmail(
  ownerId: number,
  moduleName: string,
  eventType: string,
  emailFn: EmailTemplateFn,
  emailArgs: any[],
  options: DispatchOptions = {}
): Promise<void> {
  const logTag = `[dispatchModuleEmail:${moduleName}]`;

  const isEnabled = await isModuleEventEmailEnabled(ownerId, moduleName, eventType);
  if (!isEnabled) {
    console.log(logTag, 'Email is not enabled, skipping email send');
    return;
  }

  let emails = await getRecipientEmails(ownerId, moduleName, eventType);
  if (options.extraRecipientEmails) {
    emails = await options.extraRecipientEmails(emails);
  }
  if (emails.length === 0) {
    console.log(logTag, 'No recipient emails found, skipping email send');
    return;
  }

  // Check daily email limit
  if (await isDailyEmailLimitReached(ownerId)) {
    console.log(logTag, 'Daily email limit reached for owner:', ownerId);
    const stats = await getDailyEmailStats(ownerId);
    if (stats) await warnAdminsLimitReached(ownerId, stats);
    return;
  }

  await emailFn(emails, ...emailArgs);

  await incrementDailyEmailCount(ownerId);

  // Did this send use the last slot?
  const stats = await getDailyEmailStats(ownerId);
  if (stats && stats.remaining === 0) {
    console.log(logTag, 'Daily email limit just reached for owner:', ownerId);
    await warnAdminsLimitReached(ownerId, stats);
  }
}
