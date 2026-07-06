import { requireFullAccessRole, requirePermission } from '@/lib/auth/api-auth';
import {
  ALL_FEATURE_KEYS,
  AccessLevel,
  DEFAULT_ROLE_FEATURE_ACCESS,
  FeatureKey,
  MATRIX_ROLES,
} from '@/lib/auth/feature-permissions-types';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

export async function GET() {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const rows = await prisma.role_feature_permission.findMany({
      where: { fk_owner_id: session!.user.ownerId, role: { in: MATRIX_ROLES } },
    });
    const overrides = new Map(rows.map((r) => [`${r.role}:${r.feature_key}`, r.access as AccessLevel]));

    const matrix: Record<string, Partial<Record<FeatureKey, AccessLevel>>> = {};
    for (const role of MATRIX_ROLES) {
      matrix[role] = {};
      for (const key of ALL_FEATURE_KEYS) {
        matrix[role][key] = overrides.get(`${role}:${key}`) ?? DEFAULT_ROLE_FEATURE_ACCESS[role]?.[key] ?? 'R';
      }
    }

    return NextResponse.json({ code: 1, data: { matrix } });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

const PatchSchema = z.object({
  role: z.enum(MATRIX_ROLES as [string, ...string[]]),
  access: z.record(z.string(), z.enum(['R', 'A'])),
});

export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requireFullAccessRole();
    if (error) return error;

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL019, parsed.error);

    const { role, access } = parsed.data;
    const entries = Object.entries(access).filter(([key]) => (ALL_FEATURE_KEYS as string[]).includes(key));
    if (entries.length === 0) return apiError(E.VL019, 400);

    const fk_owner_id = session!.user.ownerId;

    await prisma.$transaction(
      entries.map(([feature_key, value]) =>
        prisma.role_feature_permission.upsert({
          where: { fk_owner_id_role_feature_key: { fk_owner_id, role, feature_key } },
          create: { fk_owner_id, role, feature_key, access: value },
          update: { access: value },
        }),
      ),
    );

    return NextResponse.json({ code: 1, status: 'SUCCESS', message: 'Role permissions updated' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
