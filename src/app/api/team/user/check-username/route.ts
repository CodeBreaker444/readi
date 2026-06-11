import { supabase } from '@/backend/database/database';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { session, error } = await requirePermission('manage_users');
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username')?.toLowerCase().trim();

  if (!username || username.length < 1) {
    return NextResponse.json({ available: false }, { status: 400 });
  }

  const isSuperAdmin = session!.user.role === 'SUPERADMIN';
  const ownerId = session!.user.ownerId;

  let query = supabase
    .from('users')
    .select('user_id')
    .eq('username', username);

  if (!isSuperAdmin) {
    query = query.eq('fk_owner_id', ownerId);
  }

  const { data } = await query.maybeSingle();

  return NextResponse.json({ available: !data });
}
