import { supabase } from '@/backend/database/database';
import { createToken } from '@/lib/auth/jwt-utils';
import { Role } from '@/lib/auth/roles';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }


    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, username, email, user_active, user_role, password_hash, auth_user_id, fk_owner_id')
      .eq('email', email)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }
   console.log('pass from db:',userData.password_hash);
   console.log('pass from login:',password);
   
    const isPasswordValid = await bcrypt.compare(password, userData.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (userData.user_active !== 'Y') {
      return NextResponse.json(
        { success: false, error: 'Account not activated. Please check your email.' },
        { status: 403 }
      )
    }

    if (userData.user_role !== 'SUPERADMIN') {
      const { data: ownerData, error: ownerError } = await supabase
        .from('owner')
        .select('owner_name, owner_active')
        .eq('owner_id', userData.fk_owner_id)
        .single()

      if (ownerError || !ownerData || ownerData.owner_active !== 'Y') {
        return NextResponse.json(
          { 
            success: false, 
            error: ownerData ? `Organization "${ownerData.owner_name}" is inactive.` : 'Organization not found.' 
          },
          { status: 403 }
        )
      }
    }

    if (userData.auth_user_id) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,  
      })

      if (authError) {
        console.error('Supabase auth error:', authError)
        return NextResponse.json({ success: false, error: 'Auth sync failed' }, { status: 500 })
      }
    }

    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('user_id', userData.user_id)

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .maybeSingle()

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true'

    const payload = {
      sub: userData.user_id,
      email: userData.email,
      username: userData.username,
      role: userData.user_role as Role,
    }

    const jwtToken = createToken(payload)
    const cookieStore = await cookies()

    cookieStore.set('readi_auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: needsPasswordChange ? 60 * 30 : 60 * 60 * 24 * 7, 
      path: '/',
    })

    if (needsPasswordChange) {
      return NextResponse.json({ success: true, redirect: '/auth/change-password' })
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        role: userData.user_role as Role,
      },
    })

  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Login failed.' }, { status: 500 })
  }
}