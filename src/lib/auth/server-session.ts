'use server';

import { supabase } from '@/backend/database/database';
import { verifyToken } from '@/lib/auth/jwt-utils';
import { cookies } from 'next/headers';
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
 
export async function getUserSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('readi_auth_token')?.value;

    if (!token) {
      console.log('No auth token found');
      return null;
    }

    const payload = verifyToken(token);
    
    if (!payload || !payload.sub) {
      console.log('Invalid token');
      return null;
    }

    const userId = payload.sub;

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select(`
        user_id,
        username,
        email,
        first_name,
        last_name,
        phone,
        user_active,
        user_role,
        auth_user_id,
        fk_owner_id
      `)
      .eq('user_id', userId)
      .eq('user_active', 'Y')
      .single();

    if (userDataError || !userData) {
      console.log('No user data found in database', userDataError);
      return null;
    }

    const { data: profileData } = await supabase
      .from('users_profile')
      .select('profile_picture')
      .eq('fk_user_id', userData.user_id)  
      .single();

    const fullname = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || userData.username || userData.email;

    const sessionUser: SessionUser = {
      id: userData.auth_user_id , 
      userId: userData.user_id,
      ownerId: userData.fk_owner_id, 
      email: userData.email,
      fullname,
      username: userData.username,
      role: userData.user_role as Role,
      phone: userData.phone,
      userActive: userData.user_active,
      avatar: profileData?.profile_picture || null,
    };

    return {
      user: sessionUser,
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}