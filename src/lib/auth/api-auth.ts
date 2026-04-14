import { unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import { Permission, roleHasPermission } from './roles';
import { getUserSession, SessionUser } from './server-session';

export interface ApiAuthResult {
  session: { user: SessionUser } | null;
  error: NextResponse | null;
}

/**
 * Requires the user to have a specific permission.
 * Errors: AU002 (no session) · PX001 (insufficient role)
 */
export async function requirePermission(permission: Permission): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return { session: null, error: unauthorized(E.AU002) };
  }

  if (!roleHasPermission(session.user.role, permission)) {
    return { session: null, error: forbidden(E.PX001) };
  }

  return { session, error: null };
}

/**
 * Requires the user to have at least one of the given permissions.
 * Errors: AU003 (no session) · PX002 (insufficient role)
 */
export async function requireAnyPermission(...permissions: Permission[]): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return { session: null, error: unauthorized(E.AU003) };
  }

  const hasAny = permissions.some((p) => roleHasPermission(session.user.role, p));
  if (!hasAny) {
    return { session: null, error: forbidden(E.PX002) };
  }

  return { session, error: null };
}

/**
 * Validates that the current request has an active session (any role).
 * Use this for endpoints accessible by all authenticated users.
 * Errors: AU001 (no session)
 */
export async function requireAuth(): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return { session: null, error: unauthorized(E.AU001) };
  }

  return { session, error: null };
}
