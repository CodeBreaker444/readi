'use server';

import { supabase } from '@/backend/database/database';
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
  role: Role;
  phone?: string;
  userActive: 'Y' | 'N';
  avatar?: string | null;
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

    const userId = payload.sub;

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select(
        `
        user_id,
        username,
        email,
        first_name,
        last_name,
        phone,
        user_active,
        user_role,
        auth_user_id,
        fk_owner_id,
        users_profile!fk_user_id (
          profile_picture
        )
      `,
      )
      .eq('user_id', userId)
      .eq('user_active', 'Y')
      .single();

    if (userDataError || !userData) {
      return null;
    }

    const profileData = Array.isArray(userData.users_profile)
      ? userData.users_profile[0]
      : userData.users_profile;

    const fullname =
      [userData.first_name, userData.last_name].filter(Boolean).join(' ') ||
      userData.username ||
      userData.email;

    const avatarUrl = await resolveAvatarUrl(profileData?.profile_picture);

    const sessionUser: SessionUser = {
      id: userData.auth_user_id,
      userId: userData.user_id,
      ownerId: userData.fk_owner_id,
      email: userData.email,
      fullname,
      username: userData.username,
      role: userData.user_role as Role,
      phone: userData.phone,
      userActive: userData.user_active,
      avatar: avatarUrl,
    };

    return {
      user: sessionUser,
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
});