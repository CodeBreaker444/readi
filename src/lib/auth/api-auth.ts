import { unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getSessionEffectivePermissions } from './feature-permissions';
import { canDeleteFeature, canEditFeature, FeatureKey, FULL_ACCESS_ROLES } from './feature-permissions-types';
import { Permission, SubRole, roleHasPermission } from './roles';
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
 * Returns true if the user currently holds the given active sub-role.
 */
export async function userHasSubRole(userId: number, subrole: SubRole): Promise<boolean> {
  const row = await prisma.user_subroles.findFirst({
    where: { fk_user_id: userId, subrole, is_active: true },
    select: { id: true },
  });
  return !!row;
}

/**
 * Requires the current user's effective per-feature permission to allow the given mutation.
 * 'edit' requires access === 'A'; 'delete' additionally requires the Manager flag.
 * Errors: AU013 (no session) · PX006 (insufficient feature access)
 */
export async function requireFeatureAccess(featureKey: FeatureKey, mutation: 'edit' | 'delete'): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return { session: null, error: unauthorized(E.AU013) };
  }

  const permissions = await getSessionEffectivePermissions(session.user);
  const access = permissions[featureKey];
  const allowed = mutation === 'delete'
    ? canDeleteFeature(access, session.user.isManager)
    : canEditFeature(access);

  if (!allowed) {
    return { session: null, error: forbidden(E.PX006) };
  }

  return { session, error: null };
}

/**
 * Restricts an endpoint to ADMIN / OPM / SUPERADMIN — the roles that manage the
 * permission matrix itself. Errors: AU013 (no session) · PX004 (insufficient role)
 */
export async function requireFullAccessRole(): Promise<ApiAuthResult> {
  const session = await getUserSession();

  if (!session) {
    return { session: null, error: unauthorized(E.AU013) };
  }

  if (!FULL_ACCESS_ROLES.includes(session.user.role)) {
    return { session: null, error: forbidden(E.PX004) };
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
