import { prisma } from '@/lib/prisma';
import { getUserSession } from '@/lib/auth/server-session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function clearAuthCookies(cookieStore: Awaited<Awaited<ReturnType<typeof cookies>>>) {
  cookieStore.set('readi_auth_token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
  cookieStore.set('mfa_verified', '', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  });
}

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

export async function POST() {
  const session = await getUserSession();
  if (session?.user?.userId) {
    await prisma.public_users.update({
      where: { user_id: session.user.userId },
      data:  { last_logout_at: new Date() },
    }).catch(() => null); // non-critical — cookies are cleared regardless
  }

  const cookieStore = await cookies();
  clearAuthCookies(cookieStore);

  return NextResponse.json({ success: true });
}
