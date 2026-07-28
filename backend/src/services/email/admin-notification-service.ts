import { prisma } from '@/lib/prisma';
import { sendNotificationEmail } from '../../../../lib/resend/mail';
 

interface EmailLimitReachedNotificationData {
  ownerId: number;
  ownerName: string;
  dailyLimit: number;
  currentCount: number;
}

/**
 * Notify admins when daily email limit is reached
 * This function sends a notification email to all admin users of the company
 */
export async function notifyAdminsOnEmailLimitReached(data: EmailLimitReachedNotificationData): Promise<void> {
  const { ownerId, ownerName, dailyLimit, currentCount } = data;

  // Get all admin users for this company
  const adminUsers = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_role: 'ADMIN',
      user_active: 'Y',
    },
    select: {
      email: true,
      first_name: true,
      last_name: true,
    },
  });

  if (adminUsers.length === 0) {
    console.log('[AdminNotification] No admin users found for owner:', ownerId);
    return;
  }

  const adminEmails = adminUsers.map((user) => user.email).filter(Boolean) as string[];

  if (adminEmails.length === 0) {
    console.log('[AdminNotification] No email addresses found for admin users');
    return;
  }

  const title = `Daily Email Limit Reached - ${ownerName}`;
  const message = `
    Your company has reached the daily email limit of ${dailyLimit} emails.
    
    Current email count: ${currentCount}
    Daily limit: ${dailyLimit} .
    
    Email sending has been paused for the rest of the day. The counter will reset at midnight.
    
    If you need to increase this limit, please contact your system administrator.
  `;

  try {
    await sendNotificationEmail(adminEmails, title, message, 'email_limit_reached');
    console.log('[AdminNotification] Email limit notification sent to admins for owner:', ownerId);
  } catch (error) {
    console.error('[AdminNotification] Failed to send email limit notification:', error);
  }
}

/**
 * Check if we should notify admins about email limit reached
 * This prevents spamming admins multiple times on the same day
 */
export async function shouldNotifyEmailLimitReached(ownerId: number): Promise<boolean> {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: {
      daily_email_count: true,
      daily_email_limit: true,
      daily_email_count_reset_date: true,
      email_limit_notification_sent_date: true,
    },
  });

  if (!owner) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  const notificationSentDate = owner.email_limit_notification_sent_date
    ? new Date(owner.email_limit_notification_sent_date).toISOString().split('T')[0]
    : null;

  // Don't notify if already sent today
  if (notificationSentDate === today) {
    return false;
  }

  // Notify if limit is reached (count >= limit)
  return owner.daily_email_count >= owner.daily_email_limit;
}

/**
 * Mark that notification has been sent for today
 */
export async function markEmailLimitNotificationSent(ownerId: number): Promise<void> {
  await prisma.owner.update({
    where: { owner_id: ownerId },
    data: {
      email_limit_notification_sent_date: new Date(),
    },
  });
}
