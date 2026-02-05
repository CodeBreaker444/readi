import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicRoutes = ['/auth/login']
  
  const authFlowRoutes = [
    '/auth/change-password',
    '/auth/setup-2fa',
    '/auth/verify-mfa'
  ]

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthFlowRoute = authFlowRoutes.includes(pathname)

  if (pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (!user) {
    if (isPublicRoute) {
      return response
    }
    
    if (pathname == '/dashboard' || isAuthFlowRoute) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    
    return response
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, user_active')
      .eq('auth_user_id', user.id)
      .single()

    // If user doesn't exist in public.users or is inactive
    if (userError || !userData || userData.user_active !== 'Y') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const { data: passwordChangedSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'password_changed')
      .single()

    const needsPasswordChange = !passwordChangedSetting || passwordChangedSetting.setting_value !== 'true'

    if (needsPasswordChange) {
      if (pathname === '/auth/change-password') {
        return response
      }
      return NextResponse.redirect(new URL('/auth/change-password', request.url))
    }

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const hasMFAEnabled = factors && factors.totp && factors.totp.length > 0

    const { data: mfaEnabledSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'mfa_enabled')
      .single()

    const mfaEnabled = mfaEnabledSetting && mfaEnabledSetting.setting_value === 'true'

    if (hasMFAEnabled && mfaEnabled) {
      // Check if MFA verification is complete for this session
      const mfaVerified = request.cookies.get('mfa_verified')?.value === 'true'
      
      if (!mfaVerified) {
        if (pathname === '/auth/verify-mfa') {
          return response
        }
        return NextResponse.redirect(new URL('/auth/verify-mfa', request.url))
      }
    }

    // Check if user just changed password and hasn't seen setup-2fa yet
    const { data: mfaSetupShownSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'mfa_setup_shown')
      .single()

    const mfaSetupShown = mfaSetupShownSetting && mfaSetupShownSetting.setting_value === 'true'

    // If password just changed and MFA setup hasn't been shown yet, and user doesn't have MFA enabled
    if (!mfaSetupShown && !hasMFAEnabled) {
      if (pathname === '/auth/setup-2fa') {
        return response
      }
      return NextResponse.redirect(new URL('/auth/setup-2fa', request.url))
    }

    if (isPublicRoute || isAuthFlowRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response

  } catch (error) {
    console.error('Middleware error:', error)
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}