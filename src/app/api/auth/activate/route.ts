import { supabase } from '@/backend/database/database';
import { apiError, internalError, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const validateSchema = z.object({
  id:       z.string().min(1, 'Activation key is required'),
  email:    z.string().email('Invalid email format'),
  username: z.string().min(1, 'Username is required'),
  o:        z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = validateSchema.safeParse(body);
    if (!validation.success) return zodError(E.VL001, validation.error);

    const { id: activationKey, email, username } = validation.data;

    const user = await prisma.public_users.findFirst({
      where: { key_: activationKey, email, username },
      select: {
        user_id:       true,
        user_active:   true,
        auth_user_id:  true,
        email:         true,
        username:      true,
        password_hash: true,
        first_name:    true,
        last_name:     true,
        user_role:     true,
      },
    });

    if (!user) return apiError(E.NF001, 404);

    const isActive = user.user_active?.trim() === 'Y';
    if (isActive) return apiError(E.BL002, 400);

    let authUserId = user.auth_user_id;
    let authUserCreatedNow = false;

    if (!authUserId) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email:         user.email!,
        password:      user.password_hash!,
        email_confirm: true,
        user_metadata: {
          first_name:   user.first_name ?? '',
          last_name:    user.last_name ?? '',
          username:     user.username,
          role:         user.user_role ?? '',
          activated_at: new Date().toISOString(),
        },
      });

      if (authError) {
        // A prior activation attempt may have created the Supabase auth user but failed
        // to write auth_user_id back to the DB. Recover by looking up the existing user.
        const existingAuthUser = await prisma.auth_users.findFirst({
          where: { email: user.email! },
          select: { id: true },
        });
        if (existingAuthUser) {
          authUserId = existingAuthUser.id;
          await supabase.auth.admin.updateUserById(authUserId, {
            email_confirm: true,
            user_metadata: { activated_at: new Date().toISOString() },
          }).catch(() => {});
        } else {
          console.error('[AU008] auth user creation failed:', authError);
          return apiError(E.AU008, 500);
        }
      } else {
        if (!authData.user) {
          console.error('[AU008] no user data returned from auth creation');
          return apiError(E.AU008, 500);
        }
        authUserId = authData.user.id;
        authUserCreatedNow = true;
      }
    } else {
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserId, {
        email_confirm:  true,
        user_metadata:  { activated_at: new Date().toISOString() },
      });
      if (updateAuthError) {
        console.error('[AU008] auth email confirmation failed:', updateAuthError);
      }
    }

    const updateData: Record<string, unknown> = {
      user_active: 'Y',
      updated_at:  new Date(),
    };
    if (authUserId && !user.auth_user_id) updateData.auth_user_id = authUserId;

    try {
      await prisma.public_users.update({
        where: { user_id: user.user_id },
        data:  updateData as any,
      });
    } catch (updateErr) {
      console.error('[DB003] activation update failed:', updateErr);
      // Only delete the Supabase auth user if we just created it — not if we recovered a pre-existing one.
      if (authUserCreatedNow && authUserId) {
        await supabase.auth.admin.deleteUser(authUserId).catch((e) =>
          console.error('[DB003] auth cleanup failed:', e),
        );
      }
      return internalError(E.DB003, updateErr);
    }

    const verifyUser = await prisma.public_users.findUnique({
      where:  { user_id: user.user_id },
      select: { user_id: true, user_active: true, auth_user_id: true },
    });

    if (!verifyUser || verifyUser.user_active?.trim() !== 'Y') {
      console.error('[DB001] activation verification failed');
      return internalError(E.DB001, new Error('Activation verification failed'));
    }

    return NextResponse.json({
      code:      1,
      status:    'SUCCESS',
      message:   'Account activated successfully',
      title:     'activateAccount',
      timestamp: Math.floor(Date.now() / 1000),
      param:     [{ data: { username, email } }],
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
