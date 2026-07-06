import { requirePermission } from '@/lib/auth/api-auth';
import { ALL_FEATURE_KEYS, FeatureKey } from '@/lib/auth/feature-permissions-types';
import { getEffectiveUserPermissions } from '@/lib/auth/feature-permissions';
import { apiError, internalError, notFound, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const userId = Number((await params).userId);
    if (!Number.isInteger(userId)) return apiError(E.VL002, 400);

    const target = await prisma.public_users.findUnique({
      where: { user_id: userId },
      select: { user_id: true, fk_owner_id: true, user_role: true, has_custom_permissions: true },
    });
    if (!target) return notFound(E.NF001);
    if (!target.fk_owner_id) return notFound(E.NF001);

    const permissions = await getEffectiveUserPermissions({ ...target, fk_owner_id: target.fk_owner_id });

    return NextResponse.json({
      code: 1,
      data: { permissions, hasCustomPermissions: target.has_custom_permissions === true },
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}

const PatchSchema = z.object({
  useCustom: z.boolean(),
  access: z.record(z.string(), z.enum(['R', 'A'])).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { error } = await requirePermission('manage_users');
    if (error) return error;

    const userId = Number((await params).userId);
    if (!Number.isInteger(userId)) return apiError(E.VL002, 400);

    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL019, parsed.error);

    const target = await prisma.public_users.findUnique({ where: { user_id: userId }, select: { user_id: true } });
    if (!target) return notFound(E.NF001);

    const { useCustom, access } = parsed.data;

    if (!useCustom) {
      await prisma.$transaction([
        prisma.user_feature_permission.deleteMany({ where: { fk_user_id: userId } }),
        prisma.public_users.update({ where: { user_id: userId }, data: { has_custom_permissions: false } }),
      ]);
      return NextResponse.json({ code: 1, status: 'SUCCESS', message: 'Reset to role default permissions' });
    }

    if (!access) return apiError(E.VL019, 400);
    const entries = Object.entries(access).filter(([key]) => (ALL_FEATURE_KEYS as string[]).includes(key)) as [FeatureKey, 'R' | 'A'][];

    await prisma.$transaction([
      prisma.user_feature_permission.deleteMany({ where: { fk_user_id: userId } }),
      prisma.user_feature_permission.createMany({
        data: entries.map(([feature_key, value]) => ({ fk_user_id: userId, feature_key, access: value })),
      }),
      prisma.public_users.update({ where: { user_id: userId }, data: { has_custom_permissions: true } }),
    ]);

    return NextResponse.json({ code: 1, status: 'SUCCESS', message: 'Custom permissions saved' });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
