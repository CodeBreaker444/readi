import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getApiRoutePermission, Role, roleHasPermission, ROUTE_PERMISSIONS } from './lib/auth/roles'
import { decodeJwtPayload, decodeJwtRole, hasRoutePermission, isJwtExpired } from './lib/utils'

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

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // External API endpoints authenticated via X-API-KEY — skip cookie auth entirely
  const API_KEY_ROUTES = ['/api/missions'];
  if (API_KEY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Server-to-server endpoints called by FlytRelay using RS256 JWT (no session cookie)
  const FLYTRELAY_ROUTES = ['/api/drone-atc/user-info', '/api/drone-atc/users'];
  if (FLYTRELAY_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  const publicRoutes = ['/auth/login', '/auth/activate', '/auth/update-password', '/auth/setup-2fa', '/auth/verify-mfa']
  const authFlowRoutes = [
    '/auth/change-password',
    '/auth/setup-2fa',
    '/auth/verify-mfa'
  ]

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthFlowRoute = authFlowRoutes.includes(pathname)

  const jwtToken = request.cookies.get('readi_auth_token')?.value

  if (pathname === '/') {
    if ((jwtToken && !isJwtExpired(jwtToken)) || user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (jwtToken && isJwtExpired(jwtToken)) {
    const loginUrl = new URL('/auth/login', request.url)
    const redirectResponse = NextResponse.redirect(loginUrl)
    redirectResponse.cookies.delete('readi_auth_token')
    return redirectResponse
  }

  if (!jwtToken) {
    if (isPublicRoute) {
      return response
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (jwtToken) {
    const forcePwChange = request.cookies.get('force_pw_change')?.value === '1'
    if (forcePwChange && pathname === '/auth/change-password') {
      return NextResponse.next()
    }
    if (isPublicRoute || isAuthFlowRoute) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/api/')) {
      const required = getApiRoutePermission(pathname)

      if (required !== undefined) {
        const role = decodeJwtRole(jwtToken)
        if (!role) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        // required === null means "authenticated only, no specific permission"
        const perms = Array.isArray(required) ? required : required !== null ? [required] : null;
        if (perms !== null && !perms.some((p) => roleHasPermission(role, p))) {
          return NextResponse.json(
            { error: 'Forbidden: insufficient permissions' },
            { status: 403 }
          )
        }
      }

      // Company-level Drone ATC gate for API routes
      if (pathname.startsWith('/api/drone-atc')) {
        const role = decodeJwtRole(jwtToken)
        if (role && role !== 'SUPERADMIN') {
          const payload = decodeJwtPayload(jwtToken)
          if (!payload?.droneAtcEnabled) {
            return NextResponse.json(
              { error: 'Drone ATC is not enabled for your organization' },
              { status: 403 }
            )
          }
        }
      }

      return response
    }

    const role = decodeJwtRole(jwtToken)
    if (role) {
      const requiredEntry = ROUTE_PERMISSIONS[pathname]
      if (requiredEntry !== undefined && !hasRoutePermission(role, requiredEntry)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // Company-level Drone ATC gate for page route
    if (pathname.startsWith('/drone-atc')) {
      const role = decodeJwtRole(jwtToken)
      if (role && role !== 'SUPERADMIN') {
        const payload = decodeJwtPayload(jwtToken)
        if (!payload?.droneAtcEnabled) {
          return NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
    }

    return response
  }

  if (!user) {
    if (isPublicRoute) {
      return response
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
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
      .select('user_id, user_active, fk_owner_id, user_role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData || userData.user_active !== 'Y') {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    if (userData.user_role !== 'SUPERADMIN' && userData.fk_owner_id) {
      const { data: ownerData } = await supabase
        .from('owner')
        .select('owner_active')
        .eq('owner_id', userData.fk_owner_id)
        .single()

      if (!ownerData || ownerData.owner_active !== 'Y') {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
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

    if (!pathname.startsWith('/api/')) {
      const role = userData.user_role as Role
      const requiredEntry = ROUTE_PERMISSIONS[pathname]
      if (requiredEntry !== undefined && !hasRoutePermission(role, requiredEntry)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
