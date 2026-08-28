import { prisma } from '@/lib/prisma';
import { sendTrainingCertificationExpiringModuleEmail } from '@/backend/services/settings/module-email-notification-service';
import { TRAINING_CERTIFICATION_REMINDER_THRESHOLDS_DAYS } from '@/config/types/email-notification';

export interface ExpiringCertificationItem {
  attendance_id: number;
  training_name: string;
  user_name: string | null;
  expiry_date: string;
  days_remaining: number;
  course_owner_user_id: number | null;
}

export async function findExpiringCertificationsForOwner(ownerId: number): Promise<ExpiringCertificationItem[]> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.training_attendance.findMany({
    where: {
      certification_expiry: { not: null, gte: today },
      training: { fk_owner_id: ownerId },
    },
    select: {
      attendance_id: true,
      certification_expiry: true,
      training: { select: { training_name: true, trainer_user_id: true } },
      users: { select: { first_name: true, last_name: true } },
    },
  });

  const result: ExpiringCertificationItem[] = [];
  for (const row of rows) {
    if (!row.certification_expiry || !row.training) continue;
    const daysRemaining = Math.ceil((row.certification_expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (!TRAINING_CERTIFICATION_REMINDER_THRESHOLDS_DAYS.includes(daysRemaining)) continue;

    result.push({
      attendance_id: row.attendance_id,
      training_name: row.training.training_name,
      user_name: row.users
        ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim() || null
        : null,
      expiry_date: row.certification_expiry.toISOString().slice(0, 10),
      days_remaining: daysRemaining,
      course_owner_user_id: row.training.trainer_user_id,
    });
  }
  return result;
}

export async function sendTrainingCertificationExpiryNotifications(
  ownerId: number,
  items: ExpiringCertificationItem[],
): Promise<void> {
  for (const item of items) {
    await sendTrainingCertificationExpiringModuleEmail(ownerId, {
      trainingName: item.training_name,
      userName: item.user_name,
      expiryDate: item.expiry_date,
      daysRemaining: item.days_remaining,
      courseOwnerUserId: item.course_owner_user_id,
    });
  }
}
