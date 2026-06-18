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

    // Temporary diagnostic — remove after DB connection is confirmed
    const dbUrl = process.env.DATABASE_URL ?? '';
    const dbHost = dbUrl.replace(/^.*@/, '').replace(/\/.*$/, '');
    console.log(`[activate] DB host: ${dbHost} | key[:8]=${activationKey.slice(0, 8)} email=${email} username=${username}`);

    const user = await prisma.public_users.findFirst({
      where: {
        key_:     activationKey,
        email:    { equals: email,    mode: 'insensitive' },
        username: { equals: username, mode: 'insensitive' },
      },
      select: {
        user_id:     true,
        user_active: true,
      },
    });

    console.log(`[activate] findFirst result: ${user ? `user_id=${user.user_id} active=${user.user_active}` : 'null — no match'}`);

    if (!user) {
      // The key may have already been cleared after a successful prior activation.
      // Check by email + username so we can return the correct message.
      const alreadyActive = await prisma.public_users.findFirst({
        where: {
          email:       { equals: email,    mode: 'insensitive' },
          username:    { equals: username, mode: 'insensitive' },
          user_active: 'Y',
        },
        select: { user_id: true },
      });
      if (alreadyActive) {
        return NextResponse.json(
          { code: 0, title: 'alreadyActivated', message: 'This account is already activated.' },
          { status: 400 },
        );
      }
      return apiError(E.NF001, 404);
    }

    if (user.user_active?.trim() === 'Y') {
      return NextResponse.json(
        { code: 0, title: 'alreadyActivated', message: 'This account is already activated.' },
        { status: 400 },
      );
    }

    try {
      await prisma.public_users.update({
        where: { user_id: user.user_id },
        data:  { user_active: 'Y', key_: null, updated_at: new Date() },
      });
    } catch (updateErr) {
      console.error('[DB003] activation update failed:', updateErr);
      return internalError(E.DB003, updateErr);
    }

    const verifyUser = await prisma.public_users.findUnique({
      where:  { user_id: user.user_id },
      select: { user_active: true },
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
