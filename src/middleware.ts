import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { canAccessRoute, getApiRoutePermission, roleHasPermission } from './lib/auth/roles'
import { decodeJwtPayload, decodeJwtRole, isJwtExpired } from './lib/utils'

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

  // Docs routes require authentication
  const isDocsRoute = pathname.startsWith('/docs')

  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthFlowRoute = authFlowRoutes.includes(pathname)

  const jwtToken = request.cookies.get('readi_auth_token')?.value

  if (pathname === '/') {
    if (jwtToken && !isJwtExpired(jwtToken)) {
      const role = decodeJwtRole(jwtToken)
      const dest = role === 'CLIENT' ? '/client/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
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

  // Protect docs routes - require authentication
  if (isDocsRoute) {
    if (!jwtToken || isJwtExpired(jwtToken)) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
    return response
  }

  if (jwtToken) {
    const forcePwChange = request.cookies.get('force_pw_change')?.value === '1'
    if (forcePwChange && pathname === '/auth/change-password') {
      return NextResponse.next()
    }
    if (isPublicRoute || isAuthFlowRoute) {
      const role = decodeJwtRole(jwtToken)
      const dest = role === 'CLIENT' ? '/client/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    const roleForCheck = decodeJwtRole(jwtToken)
    if (roleForCheck === 'CLIENT') {
      const isClientPortalRoute =
        pathname.startsWith('/client/') || pathname.startsWith('/api/client-portal')
      const isAllowedAuthRoute =
        pathname === '/auth/change-password' || pathname === '/profile'
      if (!isClientPortalRoute && !isAllowedAuthRoute && !pathname.startsWith('/api/profile')) {
        return NextResponse.redirect(new URL('/client/dashboard', request.url))
      }
    }

    // Block non-CLIENT roles from client portal page routes
    if (!pathname.startsWith('/api/') && pathname.startsWith('/client/') && roleForCheck !== 'CLIENT') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
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

      // Planning edit/delete gating now lives per-route via requireFeatureAccess (feature-permissions.ts).

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
    if (role && !canAccessRoute(role, pathname)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }

    // Roles & Permissions matrix editor — ADMIN/OPM/SUPERADMIN only
    if (pathname === '/settings/roles-permissions') {
      const role = decodeJwtRole(jwtToken)
      if (role && !['ADMIN', 'OPM', 'SUPERADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // Integrations settings — ADMIN/OPM/SUPERADMIN only
    if (pathname === '/settings/integrations') {
      const role = decodeJwtRole(jwtToken)
      if (role && !['ADMIN', 'OPM', 'SUPERADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // Training email notification settings — ADMIN/OPM/SUPERADMIN only
    if (pathname.startsWith('/training/email-notifications')) {
      const role = decodeJwtRole(jwtToken)
      if (role && !['ADMIN', 'OPM', 'SUPERADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }

    // D-Flight settings & fleet — ADMIN/OPM/SUPERADMIN only
    if (pathname.startsWith('/dflight')) {
      const role = decodeJwtRole(jwtToken)
      if (role && !['ADMIN', 'OPM', 'SUPERADMIN'].includes(role)) {
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

  // Unreachable: every request with a jwtToken returns above, and requests without
  // one already returned earlier (isPublicRoute ? response : redirect to /auth/login).
  return response
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
