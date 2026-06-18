import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth/jwt-utils';
import { Role } from '@/lib/auth/roles';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError(E.AU004, 400);
    }

    const userData = await prisma.public_users.findUnique({
      where: { email },
      select: {
        user_id:       true,
        username:      true,
        email:         true,
        user_active:   true,
        user_role:     true,
        password_hash: true,
        auth_user_id:  true,
        fk_owner_id:   true,
        fk_client_id:  true,
      },
    });

    if (!userData) return apiError(E.AU005, 401);

    const isPasswordValid = await bcrypt.compare(password, userData.password_hash ?? '');
    if (!isPasswordValid) return apiError(E.AU006, 401);

    if (userData.user_active !== 'Y') return apiError(E.AU007, 403);

    let droneAtcEnabled = false;

    if (userData.user_role !== 'SUPERADMIN' && userData.user_role !== 'CLIENT') {
      const ownerData = await prisma.owner.findUnique({
        where:  { owner_id: userData.fk_owner_id! },
        select: { owner_name: true, owner_active: true, drone_atc_enabled: true },
      });

      if (!ownerData) return apiError(E.NF002, 404);
      if (ownerData.owner_active !== 'Y') return apiError(E.BL002, 403);

      droneAtcEnabled = ownerData.drone_atc_enabled ?? false;
    } else if (userData.user_role === 'CLIENT') {
      if (userData.fk_client_id) {
        const clientData = await prisma.client.findUnique({
          where:  { client_id: userData.fk_client_id },
          select: { client_active: true },
        });

        if (!clientData) return apiError(E.NF010, 404);
        if (clientData.client_active !== 'Y') return apiError(E.AU012, 403);
      }
    } else if (userData.user_role === 'SUPERADMIN') {
      droneAtcEnabled = true;
    }

    await prisma.public_users.update({
      where: { user_id: userData.user_id },
      data:  { last_login: new Date() },
    });

    const settingsData = await prisma.user_settings.findFirst({
      where:  { fk_user_id: userData.user_id, setting_key: 'password_changed' },
      select: { setting_value: true },
    });

    const needsPasswordChange = !settingsData || settingsData.setting_value !== 'true';

    const jwtToken = createToken({
      sub:   String(userData.user_id),
      email: userData.email!,
      username: userData.username!,
      role:  userData.user_role as Role,
      droneAtcEnabled,
      ...(userData.fk_client_id ? { clientId: userData.fk_client_id } : {}),
    });

    const cookieStore = await cookies();
    cookieStore.set('readi_auth_token', jwtToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    });

    if (needsPasswordChange) {
      cookieStore.set('force_pw_change', '1', {
        httpOnly: false,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   60 * 30,
        path:     '/',
      });
      return NextResponse.json({ success: true, redirect: '/auth/change-password' });
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        userId:   userData.user_id,
        username: userData.username,
        email:    userData.email,
        role:     userData.user_role as Role,
      },
    });

  } catch (err) {
    console.error('Login error:', err);
    return internalError(E.SV001, err);
  }
}
