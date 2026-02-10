import { createToken } from '@/lib/auth/jwt-utils'
import { Role } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
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

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed' },
        { status: 401 }
      )
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, username, email, user_active, user_role')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'User profile not found. Please contact administrator.' },
        { status: 404 }
      )
    }

    if (userData.user_active !== 'Y') {
      await supabase.auth.signOut()
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Please contact administrator.' },
        { status: 403 }
      )
    }

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .single()

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true'

    if (needsPasswordChange) {
      return NextResponse.json({
        success: true,
        redirect: '/auth/change-password',
      })
    }

    console.log('Creating JWT token for user:', userData.user_id)
    const jwtToken = createToken({
      sub: userData.user_id,
      email: userData.email,
      username: userData.username,
      role: userData.user_role as Role,
    })
    console.log('JWT token created successfully')

    const cookieStore = await cookies()
    cookieStore.set('readi_auth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasMFAEnabled = factors && factors.totp && factors.totp.length > 0

    if (hasMFAEnabled) {
      return NextResponse.json({
        success: true,
        redirect: '/auth/verify-mfa',
      })
    }

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

    console.log('Login successful, returning user data')
    return NextResponse.json({
      success: true,
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