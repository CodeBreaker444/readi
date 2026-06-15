'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { getPresignedDownloadUrl } from '../s3Client';
import { verifyToken } from './jwt-utils';
import { Role } from './roles';

export interface SessionUser {
  id: string;
  userId: number;
  ownerId: number;
  email: string;
  fullname: string;
  username?: string;
  clientId: number
  role: Role;
  phone?: string;
  userActive: 'Y' | 'N';
  timezone?: string
  avatar?: string | null;
  droneAtcEnabled: boolean;
  companyEasaCode: string | null;
  ownerName?: string | null;
}

export interface Session {
  user: SessionUser;
}

/**
 * Generate a presigned URL for the avatar if it's an S3 key.
 * Returns the original value if it's a legacy URL or null.
 */
async function resolveAvatarUrl(
  profilePicture: string | null | undefined,
): Promise<string | null> {
  if (!profilePicture) return null;

  if (
    profilePicture.startsWith('avatars/') ||
    profilePicture.startsWith('profiles/')
  ) {
    try {
      return await getPresignedDownloadUrl(profilePicture, 3600);  
    } catch {
      return null;
    }
  }

  return profilePicture;
}

export const getUserSession = cache(async (): Promise<Session | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('readi_auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);

    if (!payload || !payload.sub) {
      return null;
    }

    const userId = Number(payload.sub);

    const userData = await prisma.public_users.findFirst({
      where: { user_id: userId, user_active: 'Y' },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        user_active: true,
        user_role: true,
        auth_user_id: true,
        fk_owner_id: true,
        user_timezone: true,
        fk_client_id: true,
        last_logout_at: true,
        users_profile: { select: { profile_picture: true } },
      },
    });

    if (!userData) {
      return null;
    }

    // Reject tokens issued before the user's last logout (invalidates stolen/stale tokens)
    const logoutEpoch = userData.last_logout_at
      ? new Date(userData.last_logout_at).getTime() / 1000
      : 0;
    if (payload.iat && payload.iat < logoutEpoch) return null;

    const fullname =
      [userData.first_name, userData.last_name].filter(Boolean).join(' ') ||
      userData.username ||
      userData.email ||
      '';

    const avatarUrl = await resolveAvatarUrl(userData.users_profile?.profile_picture);

    let droneAtcEnabled = false;
    let companyEasaCode: string | null = null;
    let ownerName: string | null = null;
    if (userData.user_role !== 'SUPERADMIN' && userData.fk_owner_id) {
      const ownerData = await prisma.owner.findUnique({
        where: { owner_id: userData.fk_owner_id },
        select: { drone_atc_enabled: true, easa_operator_code: true, owner_name: true },
      });
      droneAtcEnabled = ownerData?.drone_atc_enabled ?? false;
      companyEasaCode = ownerData?.easa_operator_code ?? null;
      ownerName = ownerData?.owner_name ?? null;
    } else if (userData.user_role === 'SUPERADMIN') {
      droneAtcEnabled = true;
    }

    const sessionUser: SessionUser = {
      id: userData.auth_user_id ?? '',
      userId: userData.user_id,
      ownerId: userData.fk_owner_id ?? 0,
      email: userData.email ?? '',
      fullname,
      username: userData.username ?? undefined,
      role: userData.user_role as Role,
      clientId: userData.fk_client_id ?? 0,
      phone: userData.phone ?? undefined,
      userActive: userData.user_active as 'Y' | 'N',
      timezone: userData.user_timezone ?? undefined,
      avatar: avatarUrl,
      droneAtcEnabled,
      companyEasaCode,
      ownerName,
    };

    return {
      user: sessionUser,
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
});