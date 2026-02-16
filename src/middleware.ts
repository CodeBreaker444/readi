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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicRoutes = ['/auth/login', '/auth/activate','/auth/update-password', '/auth/setup-2fa', '/auth/verify-mfa']
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

    if (pathname == '/dashboard' ) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    return response
  }
  try {

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!user && session) {
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
      if (refreshedSession) {
        const { data: { user: refreshedUser } } = await supabase.auth.getUser()
        if (!refreshedUser) {
          return NextResponse.redirect(new URL('/auth/login', request.url))
        }
      }
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, user_active')
      .eq('auth_user_id', user.id)
      .single()

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
      const mfaVerified = request.cookies.get('mfa_verified')?.value === 'true'

      if (!mfaVerified) {
        if (pathname === '/auth/verify-mfa') {
          return response
        }
        return NextResponse.redirect(new URL('/auth/verify-mfa', request.url))
      }
    }

    const { data: mfaSetupShownSetting } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('fk_user_id', userData.user_id)
      .eq('setting_key', 'mfa_setup_shown')
      .single()

    const mfaSetupShown = mfaSetupShownSetting && mfaSetupShownSetting.setting_value === 'true'

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
  runtime: 'nodejs',
  matcher: [
     '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}