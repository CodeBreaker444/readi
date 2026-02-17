import { supabase } from '@/backend/database/database'
import { createToken } from '@/lib/auth/jwt-utils'
import { Role } from '@/lib/auth/roles'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

    if (userData.password_hash !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (userData.user_active !== 'Y') {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not activated. Please check your email for the activation link.'
        },
        { status: 403 }
      )
    }
    if (userData.user_role !== 'SUPERADMIN') {
      // Check owner is active from owner table directly
      const { data: ownerData, error: ownerError } = await supabase
        .from('owner')
        .select('owner_id, owner_name, owner_active')
        .eq('owner_id', userData.fk_owner_id)
        .single()

      if (ownerError || !ownerData) {
        return NextResponse.json(
          { success: false, error: 'No organization found for your account. Please contact administrator.' },
          { status: 403 }
        )
      }

      if (ownerData.owner_active !== 'Y') {
        return NextResponse.json(
          {
            success: false,
            error: `Your organization "${ownerData.owner_name}" has been deactivated. Please contact administrator.`
          },
          { status: 403 }
        )
      }

    }
    if (userData.auth_user_id) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        console.error('Supabase auth sign-in error:', authError)
        return NextResponse.json(
          { success: false, error: 'Authentication failed. Please try again.' },
          { status: 500 }
        )
      }

      if (!authData.session) {
        return NextResponse.json(
          { success: false, error: 'Failed to create session.' },
          { status: 500 }
        )
      }

      console.log('Supabase Auth session created successfully')
    } else {
      return NextResponse.json(
        { success: false, error: 'Account not properly configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userData.user_id)

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .single()

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true'

    if (needsPasswordChange) {
      const tempToken = createToken({
        sub: userData.user_id,
        email: userData.email,
        username: userData.username,
        role: userData.user_role as Role,
      })

      const cookieStore = await cookies()
      cookieStore.set('readi_auth_token', tempToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 30,
        path: '/',
      })

      return NextResponse.json({
        success: true,
        redirect: '/auth/change-password',
      })
    }

    const jwtToken = createToken({
      sub: userData.user_id,
      email: userData.email,
      username: userData.username,
      role: userData.user_role as Role,
    })

    const cookieStore = await cookies()
    cookieStore.set('readi_auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    const { data: mfaRequiredSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'mfa_required')
      .single()

    if (mfaRequiredSetting && mfaRequiredSetting.setting_value === 'true') {
      return NextResponse.json({
        success: true,
        redirect: '/auth/setup-2fa',
      })
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
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed. Please try again.' },
      { status: 500 }
    )
  }
}