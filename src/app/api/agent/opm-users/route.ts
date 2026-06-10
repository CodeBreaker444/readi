import { prisma } from '@/lib/prisma';
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
    const users = await prisma.public_users.findMany({
        where: {
            user_role: 'OPM',
            user_active: 'Y',
            fk_owner_id: user.ownerId,
        },
        select: {
            user_id: true,
            username: true,
            email: true,
            first_name: true,
            last_name: true,
        },
        orderBy: { first_name: 'asc' },
    });

    return NextResponse.json({
        users: users.map((u) => ({
            userId: u.user_id,
            email: u.email,
            fullname: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email,
            username: u.username,
        })),
    });
}
