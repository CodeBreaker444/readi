'use server';

import { createClient } from '../supabase/server';
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
}

export interface Session {
  user: SessionUser;
  expires: string;
}
 
export async function getUserSession(): Promise<Session | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user: supabaseUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !supabaseUser) {
      console.log('No authenticated user found');
      return null;
    }

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
      .eq('auth_user_id', supabaseUser.id)
      .eq('user_active', 'Y')
      .single();

    if (userDataError || !userData) {
      console.log('No user data found in database', userDataError);
      return null;
    }

    const fullname = [userData.first_name, userData.last_name]
      .filter(Boolean)
      .join(' ') || userData.username || userData.email;

    const sessionUser: SessionUser = {
      id: supabaseUser.id,
      userId: userData.user_id,
      ownerId: userData.fk_owner_id, 
      email: userData.email || supabaseUser.email || '',
      fullname,
      username: userData.username,
      role: userData.user_role as Role,
      phone: userData.phone,
      userActive: userData.user_active,
    };

    console.log('Session created:', sessionUser);

    return {
      user: sessionUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch (error) {
    console.error('Error getting server session:', error);
    return null;
  }
}