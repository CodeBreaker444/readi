import { NextResponse } from 'next/server';
import { Permission, roleHasPermission } from './roles';
import { getUserSession, SessionUser } from './server-session';

export interface ApiAuthResult {
  session: { user: SessionUser } | null;
  error: NextResponse | null;
}

 
export async function requirePermission(permission: Permission): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!roleHasPermission(session.user.role, permission)) {
    return {
      session: null,
      error: NextResponse.json(
        { code: 0, error: 'Forbidden: you do not have permission to access this resource' },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

/**
 * Requires the user to have at least one of the given permissions.
 */
export async function requireAnyPermission(...permissions: Permission[]): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const hasAny = permissions.some((p) => roleHasPermission(session.user.role, p));
  if (!hasAny) {
    return {
      session: null,
      error: NextResponse.json(
        { code: 0, error: 'Forbidden: you do not have permission to access this resource' },
        { status: 403 }
      ),
    };
  }

  return { session, error: null };
}

/**
 * Validates that the current request has an active session (any role).
 * Use this for endpoints accessible by all authenticated users.
 */
export async function requireAuth(): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ code: 0, error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { session, error: null };
}
