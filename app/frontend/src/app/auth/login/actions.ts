'use server'

import { createToken } from '@/src/lib/auth/jwt-utils'
import { Role } from '@/src/lib/auth/roles'
import { createClient } from '@/src/lib/supabase/server'
import { cookies } from 'next/headers'

export async function loginUser(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth error:', authError)
      return { success: false, error: 'Invalid email or password' }
    }

    if (!authData.user) {
      return { success: false, error: 'Authentication failed' }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, username, email, user_active, user_role')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (userError || !userData) {
      console.error('User data error:', userError)
      await supabase.auth.signOut()
      return { success: false, error: 'User profile not found. Please contact administrator.' }
    }

    if (userData.user_active !== 'Y') {
      await supabase.auth.signOut()
      return { success: false, error: 'Your account has been deactivated. Please contact administrator.' }
    }

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .single()

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true'

    if (needsPasswordChange) {
      return { success: true, redirect: '/auth/change-password' }
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
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    // Add a small delay to ensure cookie is set
    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasMFAEnabled = factors && factors.totp && factors.totp.length > 0

    if (hasMFAEnabled) {
      return { success: true, redirect: '/auth/verify-mfa' }
    }

    const { data: mfaRequiredSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'mfa_required')
      .single()

    if (mfaRequiredSetting && mfaRequiredSetting.setting_value === 'true') {
      return { success: true, redirect: '/auth/setup-2fa' }
    }

    console.log('Login successful, returning user data')
    return {
      success: true,
      data: {
        userId: userData.user_id,
        username: userData.username,
        email: userData.email,
        role: userData.user_role as Role,
        token: jwtToken,
      },
    }
  } catch (error: any) {
    console.error('Login error:', error)
    return { success: false, error: error.message || 'Login failed. Please try again.' }
  }
}