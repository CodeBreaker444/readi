import { supabase } from '@/backend/database/database';
import { forbidden, internalError, unauthorized } from '@/lib/api-error';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_FIELDS = {
    owner: ['owner_code', 'owner_phone'],
    users: ['username', 'email', 'phone'],
} as const;

const MESSAGES: Record<string, string> = {
    owner_code: 'This company code is already in use',
    owner_phone: 'This phone number is already registered to another company',
    username: 'This username is already taken',
    email: 'This email is already registered',
    phone: 'This phone number is already registered to another user',
};

function buildMessage(_table: string, field: string): string {
    return MESSAGES[field] ?? 'This value is already in use';
}

export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { searchParams } = req.nextUrl;
        const table = searchParams.get('table') as 'owner' | 'users' | null;
        const field = searchParams.get('field') ?? '';
        const value = searchParams.get('value')?.trim() ?? '';

        if (!table || !field || !value) {
            return NextResponse.json({ code: 0, message: 'Missing params' }, { status: 400 });
        }

        const allowed = ALLOWED_FIELDS[table] as readonly string[] | undefined;
        if (!allowed || !allowed.includes(field)) {
            return NextResponse.json({ code: 0, message: 'Invalid field' }, { status: 400 });
        }

        const { count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .ilike(field, value);

        const exists = (count ?? 0) > 0;

        return NextResponse.json({
            code: 1,
            exists,
            message: exists ? buildMessage(table, field) : undefined,
        });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
