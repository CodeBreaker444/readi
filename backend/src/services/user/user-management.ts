import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sendUserActivationEmail } from '../../../../lib/resend/mail';

export interface UserCreateData {
  username: string;
  fullname: string;
  email: string;
  phone?: string;
  fk_user_profile_id: number;
  user_type: string;
  is_viewer: 'Y' | 'N';
  is_manager: 'Y' | 'N';
  timezone: string;
  fk_client_id?: number;
  fk_territorial_unit?: number;
  owner_id: number;
  flytrelay_access?: boolean;
}

export interface UserUpdateData {
  user_id: number;
  owner_id: number;
  fullname?: string;
  email: string;
  user_phone?: string;
  fk_user_profile_id: number;
  fk_territorial_unit?: number | null;
  fk_client_id?: number | null;
  user_type: string;
  active: number;
  is_viewer: 'Y' | 'N';
  is_manager: 'Y' | 'N';
  user_image?: string;
  user_signature?: string;
  flytrelay_access?: boolean;
}

export async function getUserListByOwner(ownerId: number, userProfileId: number, currentUserId: number) {
  try {
    const users = await prisma.public_users.findMany({
      where: {
        ...(ownerId > 0 ? { fk_owner_id: ownerId } : {}),
        NOT: { user_id: currentUserId },
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        user_active: true,
        user_role: true,
        user_unique_code: true,
        auth_user_id: true,
        key_: true,
        is_viewer: true,
        is_manager: true,
        fk_owner_id: true,
        fk_client_id: true,
        fk_territorial_unit: true,
        fk_user_profile_id: true,
        users_profile: {
          select: { profile_picture: true, user_signature: true },
        },
        owner: {
          select: { owner_code: true, owner_name: true },
        },
        owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit: {
          select: { unit_id: true, unit_code: true, unit_name: true },
        },
      },
    });

    const formattedData = users.map((user) => ({
      user_id: user.user_id,
      username: user.username,
      fullname: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.username,
      email: user.email,
      phone: user.phone || '',
      user_role: user.user_role || 'Unknown',
      user_unique_code: user.user_unique_code || '',
      fk_user_profile_id: user.fk_user_profile_id || getRoleIdFromCode(user.user_role ?? '') || 0,
      active: user.user_active === 'Y' ? 1 : 0,
      is_pending: user.user_active !== 'Y' && !user.auth_user_id && user.key_ !== null,
      is_viewer: user.is_viewer,
      is_manager: user.is_manager,
      fk_client_id: user.fk_client_id ?? null,
      fk_territorial_unit: user.fk_territorial_unit,
      terr_unit_code: user.owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit?.unit_code || '',
      terr_unit_desc: user.owner_territorial_unit_users_fk_territorial_unitToowner_territorial_unit?.unit_name || '',
      owner_code: user.owner?.owner_code || '',
      owner_name: user.owner?.owner_name || '',
      profile_image: user.users_profile?.profile_picture || '',
      user_image: user.users_profile?.profile_picture || '',
      user_signature: user.users_profile?.user_signature || '',
    }));

    return { success: true, data: formattedData, count: formattedData.length };
  } catch (error) {
    console.error('Error fetching user list:', error);
    throw new Error('Failed to fetch user list');
  }
}

export async function createUser(userData: UserCreateData) {
  try {
    const uid = generateUniqueCode();
    const key = generateActivationToken(32);

    const userName = userData.username.toLowerCase();

    const [byEmail, byUsername] = await Promise.all([
      prisma.public_users.findFirst({
        where:  { email: { equals: userData.email, mode: 'insensitive' } },
        select: { user_id: true, email: true, username: true, user_active: true, auth_user_id: true },
      }),
      prisma.public_users.findFirst({
        where:  { username: userName },
        select: { user_id: true, email: true, username: true, user_active: true, auth_user_id: true },
      }),
    ]);

    // If email and username each match a different existing user
    if (byEmail && byUsername && byEmail.user_id !== byUsername.user_id) {
      throw new Error('A user with this email or username already exists');
    }

    const existingUser = byEmail ?? byUsername;

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === userData.email.toLowerCase()) {
        const isPending = existingUser.user_active !== 'Y' && !existingUser.auth_user_id;
        if (isPending) {
          throw new Error('PENDING_ACTIVATION:' + existingUser.user_id);
        }
        throw new Error('A user with this email already exists');
      }
      if (existingUser.username === userName) {
        throw new Error('This username is already taken');
      }
    }

    const nameParts = userData.fullname.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const saltRounds = 10;
    const hashedPasscode = await bcrypt.hash(uid, saltRounds);

    const newUser = await prisma.public_users.create({
      data: {
        username: userName,
        email: userData.email,
        password_hash: hashedPasscode,
        first_name: firstName,
        last_name: lastName,
        phone: userData.phone,
        fk_owner_id: userData.owner_id,
        fk_client_id: userData.fk_client_id || null,
        fk_territorial_unit: userData.fk_territorial_unit || null,
        user_type: userData.user_type,
        user_active: 'N',
        user_role: getRoleCode(userData.fk_user_profile_id),
        is_viewer: userData.is_viewer,
        is_manager: userData.is_manager,
        user_timezone: userData.timezone,
        user_unique_code: uid,
        key_: key,
        flytrelay_access: userData.flytrelay_access ?? false,
      },
      select: { user_id: true },
    });

    const userOwner = await prisma.user_owner.create({
      data: {
        fk_user_id: newUser.user_id,
        fk_owner_id: userData.owner_id,
        relationship_type: 'EMPLOYEE',
        role_in_organization: getRoleLabel(userData.fk_user_profile_id),
        is_primary: true,
        is_active: true,
      },
      select: { user_owner_id: true },
    });

    await prisma.users_profile.create({
      data: {
        fk_user_id: newUser.user_id,
        address: null,
        city: null,
        state: null,
        postal_code: null,
        fk_country_id: null,
        certifications: Prisma.JsonNull,
        skills: Prisma.JsonNull,
      },
    });

    await prisma.user_settings.create({
      data: {
        fk_user_id: newUser.user_id,
        setting_key: 'password_changed',
        setting_value: 'false',
      },
    });

    const activationLink = `${env.APP_URL}/auth/activate?o=${userData.owner_id}&email=${encodeURIComponent(userData.email)}&username=${encodeURIComponent(userName)}&id=${key}`;

    console.log('activation link:', activationLink);
    console.log('pass:', uid);

    let emailSent = false;
    let emailError: string | null = null;

    try {
      await sendUserActivationEmail(
        userData.email,
        userData.fullname,
        {
          organization: 'ReADI Control Center',
          username: userName,
          passcode: uid,
          loginlink: activationLink,
        }
      );
      emailSent = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : String(err);
      console.error('[createUser] activation email failed:', emailError);
    }

    return {
      success: true,
      userId: newUser.user_id,
      userOwnerId: userOwner.user_owner_id,
      activationKey: key,
      emailSent,
      emailError,
      message: emailSent ? 'User created successfully' : `User created but activation email failed: ${emailError}`,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create user');
  }
}

export async function updateUser(userData: UserUpdateData) {
  try {
    const toIntOrNull = (v: unknown): number | null => {
      if (v === undefined || v === null || v === '' || v === 'undefined' || v === 'null') return null;
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    };

    const nameParts = userData.fullname ? userData.fullname.trim().split(' ') : null;
    const nameData = nameParts
      ? { first_name: nameParts[0] || '', last_name: nameParts.slice(1).join(' ') || '' }
      : {};

    await prisma.public_users.updateMany({
      where: {
        user_id: userData.user_id,
        ...(userData.owner_id > 0 ? { fk_owner_id: userData.owner_id } : {}),
      },
      data: {
        ...nameData,
        email: userData.email,
        phone: userData.user_phone || null,
        user_type: userData.user_type || null,
        user_active: userData.active === 1 ? 'Y' : 'N',
        is_viewer: userData.is_viewer || null,
        is_manager: userData.is_manager || null,
        fk_territorial_unit: toIntOrNull(userData.fk_territorial_unit),
        fk_client_id: toIntOrNull(userData.fk_client_id),
        flytrelay_access: userData.flytrelay_access,
        updated_at: new Date(),
      },
    });

    if (userData.user_image || userData.user_signature) {
      const profileUpdate: { profile_picture?: string; user_signature?: string } = {};
      if (userData.user_image) profileUpdate.profile_picture = userData.user_image;
      if (userData.user_signature) profileUpdate.user_signature = userData.user_signature;

      await prisma.users_profile.update({
        where: { fk_user_id: userData.user_id },
        data: profileUpdate,
      });
    }

    await prisma.user_owner.updateMany({
      where: {
        fk_user_id: userData.user_id,
        ...(userData.owner_id > 0 ? { fk_owner_id: userData.owner_id } : {}),
      },
      data: { role_in_organization: getRoleLabel(userData.fk_user_profile_id) },
    });

    return { success: true, message: 'User updated successfully' };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(userId: number, ownerId: number, isSuperAdmin = false) {
  try {
    const userRecord = await prisma.public_users.findFirst({
      where: {
        user_id: userId,
        ...(!isSuperAdmin ? { fk_owner_id: ownerId } : {}),
      },
      select: { auth_user_id: true, first_name: true, last_name: true, email: true },
    });

    if (!userRecord) throw new Error('User not found or does not belong to this organization');

    await prisma.notification.deleteMany({ where: { fk_user_id: userId } }).catch((e) =>
      console.warn('[deleteUser] notification cleanup failed:', e)
    );

    await Promise.allSettled([
      prisma.checklist.updateMany({ where: { fk_user_id: userId }, data: { fk_user_id: null } }),
      prisma.kanban.updateMany({ where: { fk_user_id: userId }, data: { fk_user_id: null } }),
      prisma.planning_logbook.updateMany({ where: { fk_user_id: userId }, data: { fk_user_id: null } }),
      prisma.training_attendance.deleteMany({ where: { fk_user_id: userId } }),
    ]);

    await prisma.public_users.deleteMany({
      where: {
        user_id: userId,
        ...(!isSuperAdmin ? { fk_owner_id: ownerId } : {}),
      },
    });

    if (userRecord.auth_user_id) {
      try {
        await supabase.auth.admin.deleteUser(userRecord.auth_user_id);
      } catch (authError) {
        console.error('Failed to delete auth user (non-fatal):', authError);
      }
    }

    const fullName = `${userRecord.first_name ?? ''} ${userRecord.last_name ?? ''}`.trim() || null;
    return { success: true, message: 'User deleted successfully', fullName, email: userRecord.email ?? null };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export async function resendUserInvite(userId: number, ownerId: number, isSuperAdmin = false) {
  const user = await prisma.public_users.findFirst({
    where: {
      user_id: userId,
      ...(!isSuperAdmin ? { fk_owner_id: ownerId } : {}),
    },
    select: {
      user_id: true,
      email: true,
      username: true,
      first_name: true,
      last_name: true,
      user_active: true,
      auth_user_id: true,
      user_unique_code: true,
      fk_owner_id: true,
    },
  });

  if (!user) throw new Error('User not found');
  if (user.user_active === 'Y') {
    throw new Error('User is already activated');
  }

  const newKey = generateActivationToken(32);

  await prisma.public_users.update({
    where: { user_id: userId },
    data: { key_: newKey, updated_at: new Date() },
  });

  const fullname = (`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()) || (user.username ?? '');
  const activationLink = `${env.APP_URL}/auth/activate?o=${user.fk_owner_id}&email=${encodeURIComponent(user.email ?? '')}&username=${encodeURIComponent(user.username ?? '')}&id=${newKey}`;

  const emailResult = await sendUserActivationEmail(
    user.email ?? '',
    fullname,
    {
      organization: 'ReADI Control Center',
      username: user.username ?? '',
      passcode: user.user_unique_code ?? '',
      loginlink: activationLink,
    }
  );

  return {
    success: true,
    message: 'Activation email resent successfully',
    emailSent: emailResult.message,
  };
}

const getRoleIdFromCode = (roleCode: string): number => {
  const codeToId: Record<string, number> = {
    'PIC': 8, 'OPM': 9, 'SM': 10, 'AM': 11,
    'CMM': 12, 'RM': 13, 'TM': 14, 'DC': 15, 'SLA': 16, 'ADMIN': 17,
  };
  return codeToId[roleCode] || 0;
};

const getRoleLabel = (profileId: number): string => {
  const roleMapping: Record<number, string> = {
    8: 'PIC', 9: 'OPM', 10: 'SM', 11: 'AM',
    12: 'CMM', 13: 'RM', 14: 'TM', 15: 'DC', 16: 'SLA', 17: 'ADMIN',
  };
  return roleMapping[profileId] || 'Unknown';
};

const getRoleCode = (profileId: number): string => {
  return getRoleLabel(profileId);
};

export const generateUniqueCode = (): string => {
  return `USR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
};

export const generateActivationToken = (length: number): string => {
  const bytes = length * 2;
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
