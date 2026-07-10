import { updateUser } from '@/backend/services/user/user-management';
import { requireFeatureAccess, requirePermission } from '@/lib/auth/api-auth';
import { apiError, dbError, internalError, notFound, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const UpdateUserSchema = z.object({
  user_id: z.number().int().positive('Invalid user ID'),
  fullname: z.string().min(1, 'Full name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  user_phone: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  fk_user_profile_id: z.number().int().positive().optional(),
  profile_id: z.number().int().positive().optional(),
  fk_territorial_unit: z.number().int().optional().nullable(),
  territorial_id: z.number().int().optional().nullable(),
  fk_client_id: z.number().int().optional().nullable(),
  user_type: z.enum(['EMPLOYEE', 'EXTERNAL']).optional(),
  active: z.number().int().min(0).max(1).optional(),
  is_viewer: z.enum(['Y', 'N']).optional(),
  is_manager: z.enum(['Y', 'N']).optional(),
  user_viewer: z.enum(['Y', 'N']).optional(),
  user_manager: z.enum(['Y', 'N']).optional(),
  owner_id: z.number().int().positive().optional(),
  user_image: z.string().optional().nullable(),
  user_signature: z.string().optional().nullable(),
  flytrelay_access: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('manage_users');
    if (error) return error;

    const { error: featureError } = await requireFeatureAccess('team_personnel', 'edit');
    if (featureError) return featureError;

    const user = session!.user;
    const body = await request.json();

    const parsed = UpdateUserSchema.safeParse(body);
    if (!parsed.success) return zodError(E.VL014, parsed.error);

    const d = parsed.data;

    const result = await updateUser({
      user_id: d.user_id,
      owner_id: d.owner_id || user.ownerId,
      fullname: d.fullname,
      email: d.email!,
      user_phone: d.user_phone || d.phone || undefined,
      fk_user_profile_id: d.fk_user_profile_id || d.profile_id || 0,
      fk_territorial_unit: (d.fk_territorial_unit ?? d.territorial_id) ?? undefined,
      fk_client_id: d.fk_client_id ?? undefined,
      user_type: d.user_type || 'EMPLOYEE',
      active: d.active ?? 1,
      is_viewer: d.is_viewer || d.user_viewer || 'N',
      is_manager: d.is_manager || d.user_manager || 'N',
      user_image: d.user_image || undefined,
      user_signature: d.user_signature || undefined,
      flytrelay_access: d.flytrelay_access,
    });

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'User updated successfully',
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'User not found or does not belong to this organization') return notFound(E.NF001);
    const supaErr = err as { code?: string };
    if (supaErr?.code === '23505') return dbError(E.DB003, err);
    if (supaErr?.code === '23503') return dbError(E.DB003, err);
    return internalError(E.SV001, err);
  }
}
