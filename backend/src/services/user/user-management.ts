import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import { sendUserActivationEmail } from 'lib/resend/mail';

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
}

export interface UserUpdateData {
  user_id: number;
  owner_id: number;
  fullname: string;
  user_phone?: string;
  fk_user_profile_id: number;
  fk_territorial_unit?: number;
  fk_client_id?: number;
  user_type: string;
  active: number;
  is_viewer: 'Y' | 'N';
  is_manager: 'Y' | 'N';
  user_image?: string;
  user_signature?: string;
}

export async function getUserListByOwner(ownerId: number, userProfileId: number) {
  try {
    let query = supabase
      .from('users')
      .select(`
        user_id,
        username,
        email,
        first_name,
        last_name,
        phone,
        user_active,
        user_type,
        is_viewer,
        is_manager,
        fk_owner_id,
        fk_client_id,
        fk_territorial_unit,
        fk_user_profile_id,
        users_profile!inner (
          fk_user_id,
          profile_picture,
          user_signature
        ),
        owner!inner (
          owner_code,
          owner_name
        ),
        owner_territorial_unit!users_fk_territorial_unit_fkey (
          unit_id,
          unit_code,
          unit_name
        )
      `);

    if (ownerId > 0) {
      query = query.eq('fk_owner_id', ownerId);
    }

    // if (userProfileId > 0) {
    //   query = query.eq('fk_user_profile_id', userProfileId);
    // }

    const { data, error } = await query;

    if (error) throw error;

    const formattedData = data.map((user: any) => ({
      user_id: user.user_id,
      username: user.username,
      fullname: `${user.first_name} ${user.last_name}`.trim(),
      email: user.email,
      user_profile: getRoleLabel(user.fk_user_profile_id),
      fk_user_profile_id: user.fk_user_profile_id,
      active: user.user_active === 'Y' ? 1 : 0,
      user_type: user.user_type,
      is_viewer: user.is_viewer,
      is_manager: user.is_manager,
      fk_territorial_unit: user.fk_territorial_unit,
      terr_unit_code: user.owner_territorial_unit?.unit_code || '',
      terr_unit_desc: user.owner_territorial_unit?.unit_name || '',
      owner_code: user.owner?.owner_code || '',
      owner_name: user.owner?.owner_name || '',
      profile_image: user.users_profile?.[0]?.profile_picture || '',
      user_image: user.users_profile?.[0]?.profile_picture || '',
      user_signature: user.users_profile?.[0]?.user_signature || '',
    }));

    return {
      success: true,
      data: formattedData,
      count: formattedData.length,
    };
  } catch (error) {
    console.error('Error fetching user list:', error);
    throw new Error('Failed to fetch user list');
  }
}

export async function createUser(userData: UserCreateData) {
  try {
    const uid = generateUniqueCode();
    const key = generateActivationToken(128);

    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id, email, username')
      .or(`email.ilike.${userData.email},username.eq.${userData.username}`)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === userData.email.toLowerCase()) {
        throw new Error('This email is already registered');
      }
      if (existingUser.username === userData.username) {
        throw new Error('This username is already taken');
      }
    }

    const nameParts = userData.fullname.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        username: userData.username,
        email: userData.email,
        password_hash: uid,  
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
        _key_: key,
        notes: '',
      })
      .select()
      .single();

    if (insertError) {
      console.error('User insert error:', insertError);
      throw insertError;
    }

    const { data: userOwner, error: userOwnerError } = await supabase
      .from('user_owner')
      .insert({
        fk_user_id: newUser.user_id,
        fk_owner_id: userData.owner_id,
        relationship_type: 'EMPLOYEE',
        role_in_organization: getRoleLabel(userData.fk_user_profile_id),
        is_primary: true,
        is_active: true,
      })
      .select()
      .single();

    if (userOwnerError) {
      console.error('User-owner relationship error:', userOwnerError);
      throw userOwnerError;
    }

    const activationLink = `${env.APP_URL}/auth/activate?o=${userData.owner_id}&email=${userData.email}&username=${userData.username}&id=${key}`;

    const emailResult = await sendUserActivationEmail(
      userData.email,
      userData.fullname,
      {
        organization: 'ReADI Control Center',
        username: userData.username,
        passcode: uid,
        loginlink: activationLink,
      }
    );

    return {
      success: true,
      userId: newUser.user_id,
      userOwnerId: userOwner.user_owner_id,
      activationKey: key,
      emailSent: emailResult.message,
      message: 'User created successfully',
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create user');
  }
}

export async function updateUser(userData: UserUpdateData) {
  try {
    const nameParts = userData.fullname.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const updateData: any = {
      first_name: firstName,
      last_name: lastName,
      phone: userData.user_phone,
      user_type: userData.user_type,
      user_active: userData.active === 1 ? 'Y' : 'N',
      is_viewer: userData.is_viewer,
      is_manager: userData.is_manager,
      fk_territorial_unit: userData.fk_territorial_unit || null,
      fk_client_id: userData.fk_client_id || null,
      updated_at: new Date().toISOString(),
    };

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userData.user_id)
      .eq('fk_owner_id', userData.owner_id);

    if (userError) throw userError;

    if (userData.user_image || userData.user_signature) {
      const profileUpdate: any = {};
      if (userData.user_image) profileUpdate.profile_picture = userData.user_image;
      if (userData.user_signature) profileUpdate.user_signature = userData.user_signature;

      const { error: profileError } = await supabase
        .from('users_profile')
        .update(profileUpdate)
        .eq('fk_user_id', userData.user_id);

      if (profileError) throw profileError;
    }

    const { error: userOwnerError } = await supabase
      .from('user_owner')
      .update({
        role_in_organization: getRoleLabel(userData.fk_user_profile_id),
      })
      .eq('fk_user_id', userData.user_id)
      .eq('fk_owner_id', userData.owner_id);

    if (userOwnerError) throw userOwnerError;

    return {
      success: true,
      message: 'User updated successfully',
    };
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
}

export async function deleteUser(userId: number, ownerId: number) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ user_active: 'N' })
      .eq('user_id', userId)
      .eq('fk_owner_id', ownerId);

    if (error) throw error;

    return {
      success: true,
      message: 'User deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
}

const getRoleLabel = (profileId: number): string => {
  const roleMapping: Record<number, string> = {
    8: 'PIC',
    9: 'OPM',
    10: 'SM',
    11: 'AM',
    12: 'CMM',
    13: 'RM',
    14: 'TM',
    15: 'DC',
    16: 'SLA',
    17: 'ADMIN',
  };
  return roleMapping[profileId] || 'Unknown';
}

const getRoleCode = (profileId: number): string => {
  return getRoleLabel(profileId);
}

const generateUniqueCode = (): string => {
  return `USR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
}

const generateActivationToken = (length: number): string => {
  const bytes = length * 2;
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};