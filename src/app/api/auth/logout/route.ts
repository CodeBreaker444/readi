import { supabase } from '@/backend/database/database';
import { getUserSession } from '@/lib/auth/server-session';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await getUserSession();
  if (session?.user?.userId) {
    await supabase
      .from('users')
      .update({ last_logout_at: new Date().toISOString() })
      .eq('user_id', session.user.userId);
  }

  const cookieStore = await cookies();

  cookieStore.set('readi_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  cookieStore.set('mfa_verified', '', {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return NextResponse.json({ success: true });
}
