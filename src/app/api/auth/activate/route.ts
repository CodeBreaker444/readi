import { supabase } from '@/backend/database/database';
import { apiError, dbError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const validateSchema = z.object({
  id: z.string().min(1, 'Activation key is required'),
  email: z.string().email('Invalid email format'),
  username: z.string().min(1, 'Username is required'),
  o: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { id: activationKey, email, username } = validation.data;

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('user_id, user_active, auth_user_id, email, username, _key_, password_hash, first_name, last_name, user_role')
      .eq('_key_', activationKey)
      .eq('email', email)
      .eq('username', username)
      .maybeSingle();

    if (findError) {
      console.error('[AU011] activation db lookup:', findError);
      return dbError(E.DB001, findError);
    }

    if (!user) return apiError(E.NF001, 404);

    const isActive = user.user_active?.trim() === 'Y';
    if (isActive) return apiError(E.BL002, 400);

    let authUserId = user.auth_user_id;

    if (!authUserId) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password_hash,
        email_confirm: true,
        user_metadata: {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          username: user.username,
          role: user.user_role || '',
          activated_at: new Date().toISOString(),
        },
      });

      if (authError) {
        console.error('[AU008] auth user creation failed:', authError);
        return apiError(E.AU008, 500);
      }
      if (!authData.user) {
        console.error('[AU008] no user data returned from auth creation');
        return apiError(E.AU008, 500);
      }

      authUserId = authData.user.id;
    } else {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserId, {
        email_confirm: true,
        user_metadata: { activated_at: new Date().toISOString() },
      });
      if (updateAuthError) {
        console.error('[AU008] auth email confirmation failed:', updateAuthError);
      }
    }

    const updateData: Record<string, unknown> = {
      user_active: 'Y',
      updated_at: new Date().toISOString(),
    };
    if (authUserId && !user.auth_user_id) updateData.auth_user_id = authUserId;

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', user.user_id);

    if (updateError) {
      console.error('[DB003] activation update failed:', updateError);
      if (authUserId && !user.auth_user_id) {
        await supabase.auth.admin.deleteUser(authUserId).catch((e) =>
          console.error('[DB003] auth cleanup failed:', e),
        );
      }
      return dbError(E.DB003, updateError);
    }

    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('user_id, user_active, auth_user_id')
      .eq('user_id', user.user_id)
      .single();

    if (verifyError || !verifyUser || verifyUser.user_active?.trim() !== 'Y') {
      console.error('[DB001] activation verification failed:', verifyError);
      return dbError(E.DB001, verifyError);
    }

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: 'Account activated successfully',
      title: 'activateAccount',
      timestamp: Math.floor(Date.now() / 1000),
      param: [{ data: { username, email } }],
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
