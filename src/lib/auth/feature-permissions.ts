import { prisma } from '@/lib/prisma';
import { Role, roleHasPermission } from './roles';
import type { SessionUser } from './server-session';
import type { AccessLevel, FeatureKey } from './feature-permissions-types';
import { FULL_ACCESS_ROLES, MATRIX_ROLES, DEFAULT_ROLE_FEATURE_ACCESS, ALL_FEATURE_KEYS, featureToLegacyPermission } from './feature-permissions-types';

function isFullAccessRole(role: Role | null | undefined): boolean {
  return !!role && FULL_ACCESS_ROLES.includes(role);
}

/**
 * Resolves a single role's access to a feature: full-access-role bypass
 */
export async function getRoleFeatureAccess(ownerId: number, role: Role | null | undefined, featureKey: FeatureKey): Promise<AccessLevel | null> {
  if (!role) return null;
  if (isFullAccessRole(role)) return 'A';

  if (MATRIX_ROLES.includes(role)) {
    const row = await prisma.role_feature_permission.findUnique({
      where: { fk_owner_id_role_feature_key: { fk_owner_id: ownerId, role, feature_key: featureKey } },
    });
    if (row) return row.access as AccessLevel;
    return DEFAULT_ROLE_FEATURE_ACCESS[role]?.[featureKey] ?? null;
  }

  return roleHasPermission(role, featureToLegacyPermission(featureKey)) ? 'A' : null;
}

interface EffectivePermissionsUser {
  user_id: number;
  fk_owner_id: number;
  user_role: string | null;
  has_custom_permissions?: boolean | null;
}

/** Full effective feature map for a user: custom overrides if enabled, else their role's table. */
export async function getEffectiveUserPermissions(user: EffectivePermissionsUser): Promise<Record<FeatureKey, AccessLevel | null>> {
  const role = user.user_role as Role | null;
  const result = {} as Record<FeatureKey, AccessLevel | null>;

  if (isFullAccessRole(role)) {
    for (const key of ALL_FEATURE_KEYS) result[key] = 'A';
    return result;
  }

  if (user.has_custom_permissions) {
    const rows = await prisma.user_feature_permission.findMany({ where: { fk_user_id: user.user_id } });
    const overrides = new Map(rows.map((r) => [r.feature_key as FeatureKey, r.access as AccessLevel]));
    for (const key of ALL_FEATURE_KEYS) result[key] = overrides.get(key) ?? null;
    return result;
  }

  for (const key of ALL_FEATURE_KEYS) {
    result[key] = await getRoleFeatureAccess(user.fk_owner_id, role, key);
  }
  return result;
}

/** Convenience wrapper for the common case: resolving permissions for the current session user. */
export async function getSessionEffectivePermissions(user: SessionUser): Promise<Record<FeatureKey, AccessLevel | null>> {
  return getEffectiveUserPermissions({
    user_id: user.userId,
    fk_owner_id: user.ownerId,
    user_role: user.role,
    has_custom_permissions: user.hasCustomPermissions,
  });
}
