import { supabase } from '@/backend/database/database';
import { createToken } from '@/lib/auth/jwt-utils';
import { Role } from '@/lib/auth/roles';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError(E.AU004, 400);
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, username, email, user_active, user_role, password_hash, auth_user_id, fk_owner_id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      return apiError(E.AU005, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
    if (!isPasswordValid) {
      return apiError(E.AU006, 401);
    }

    if (userData.user_active !== 'Y') {
      return apiError(E.AU007, 403);
    }

    if (userData.user_role !== 'SUPERADMIN') {
      const { data: ownerData, error: ownerError } = await supabase
        .from('owner')
        .select('owner_name, owner_active')
        .eq('owner_id', userData.fk_owner_id)
        .single();

      if (ownerError || !ownerData || ownerData.owner_active !== 'Y') {
        if (!ownerData) return apiError(E.NF002, 404);
        return apiError(E.BL002, 403);
      }
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userData.user_id);

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .maybeSingle();

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true';

    const jwtToken = createToken({
      sub: userData.user_id,
      email: userData.email,
      username: userData.username,
      role: userData.user_role as Role,
    });

    const cookieStore = await cookies();
    cookieStore.set('readi_auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: needsPasswordChange ? 60 * 30 : 60 * 60 * 24 * 7,
      path: '/',
    });

    if (needsPasswordChange) {
      cookieStore.set('force_pw_change', '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30,
        path: '/',
      });
      return NextResponse.json({ success: true, redirect: '/auth/change-password' });
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        userId:   userData.user_id,
        username: userData.username,
        email:    userData.email,
        role:     userData.user_role as Role,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return internalError(E.SV001, err);
  }
}