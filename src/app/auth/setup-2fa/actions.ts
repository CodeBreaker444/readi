'use server';

import { prisma } from '@/lib/prisma';

export async function getUserIdByAuthId(authUserId: string): Promise<number | null> {
  const user = await prisma.public_users.findFirst({
    where: { auth_user_id: authUserId },
    select: { user_id: true },
  });
  return user?.user_id ?? null;
}

export async function getUserRoleByAuthId(authUserId: string): Promise<string | null> {
  const user = await prisma.public_users.findFirst({
    where: { auth_user_id: authUserId },
    select: { user_role: true },
  });
  return user?.user_role ?? null;
}

export async function saveMfaSettings(userId: number, mfaEnabled: boolean): Promise<void> {
  const now = new Date();
  const settings = [
    { fk_user_id: userId, setting_key: 'mfa_enabled', setting_value: String(mfaEnabled), setting_type: 'boolean', updated_at: now },
    { fk_user_id: userId, setting_key: 'mfa_setup_shown', setting_value: 'true', setting_type: 'boolean', updated_at: now },
  ];

  await Promise.all(
    settings.map((s) =>
      prisma.user_settings.upsert({
        where: { fk_user_id_setting_key: { fk_user_id: s.fk_user_id, setting_key: s.setting_key } },
        update: { setting_value: s.setting_value, updated_at: s.updated_at },
        create: s,
      })
    )
  );
}
