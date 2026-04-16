import { supabase } from '@/backend/database/database';
import { forbidden } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

 
export async function GET() {
    const { session, error } = await requireAuth();
    if (error) return error;

    const user = session!.user;

    if (user.role !== 'ADMIN') {
        return forbidden(E.PX001);
    }
// Returns the list of active OPM users for the same owner as the logged-in admin.
    const { data, error: dbError } = await supabase
        .from('users')
        .select('user_id, username, email, first_name, last_name')
        .eq('user_role', 'OPM')
        .eq('user_active', 'Y')
        .eq('fk_owner_id', user.ownerId)
        .order('first_name', { ascending: true });

    if (dbError) {
        console.error('[opm-users] DB error:', dbError);
        return NextResponse.json({ error: 'Failed to fetch OPM users' }, { status: 500 });
    }

    const users = (data ?? []).map((u) => ({
        userId: u.user_id,
        email: u.email,
        fullname: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email,
        username: u.username,
    }));

    return NextResponse.json({ users });
}
