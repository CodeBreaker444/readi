import { supabase } from '@/backend/database/database';
import { internalError, unauthorized, zodError } from '@/lib/api-error';
import { createToken, verifyToken } from '@/lib/auth/jwt-utils';
import { E } from '@/lib/error-codes';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import z from 'zod';

const validateSchema = z.object({
  newPassword: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateSchema.safeParse(body);

    if (!validation.success) return zodError(E.VL001, validation.error);

    const { newPassword } = validation.data;

    const cookieStore = await cookies();
    const token = cookieStore.get('readi_auth_token')?.value;

    if (!token) return unauthorized(E.AU001);

    const payload = verifyToken(token);
    if (!payload || !payload.sub) return unauthorized(E.AU010);

    const userId = Number(payload.sub);

    const userData = await prisma.public_users.findUnique({
      where:  { user_id: userId },
      select: { user_id: true, auth_user_id: true, email: true },
    });

    if (!userData) {
      return NextResponse.json({ code: 0, error: 'User not found' }, { status: 404 });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    if (userData.auth_user_id) {
      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
        userData.auth_user_id,
        { password: newPassword },
      );
      if (authUpdateError) return internalError(E.AU008, authUpdateError);
    }

    await prisma.public_users.update({
      where: { user_id: userId },
      data:  { password_hash: hashedNewPassword, updated_at: new Date() },
    });

    await prisma.user_settings.upsert({
      where: {
        fk_user_id_setting_key: { fk_user_id: userId, setting_key: 'password_changed' },
      },
      create: {
        fk_user_id:    userId,
        setting_key:   'password_changed',
        setting_value: 'true',
        setting_type:  'boolean', 
        updated_at:    new Date(),
      },
      update: {
        setting_value: 'true',
        setting_type:  'boolean',
        updated_at:    new Date(),
      },
    }).catch((e) => console.error('Settings sync error:', e));

    cookieStore.delete('force_pw_change');

    const freshToken = createToken({
      sub:      payload.sub,
      email:    payload.email,
      username: payload.username,
      role:     payload.role,
    });
    cookieStore.set('readi_auth_token', freshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    });

    return NextResponse.json({ success: true, message: 'Password changed successfully' });

  } catch (err) {
    console.error('Change password error:', err);
    return internalError(E.SV001, err);
  }
}
