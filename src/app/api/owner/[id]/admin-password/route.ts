import { updateAdminPassword } from '@/backend/services/company/owner-service';
import { forbidden, internalError, unauthorized } from '@/lib/api-error';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import z from 'zod';

const schema = z.object({
    admin_user_id: z.number({ message: 'Admin user ID is required' }),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const body = await req.json();
        const parsed = schema.safeParse(body);

        if (!parsed.success) {
            const msg = parsed.error.issues.map((i) => i.message).join(', ');
            return NextResponse.json({ code: 0, message: msg }, { status: 400 });
        }

        const { admin_user_id, new_password } = parsed.data;

        const result = await updateAdminPassword(id, admin_user_id, new_password);

        return NextResponse.json({ code: 1, message: result.message });
    } catch (err: any) {
        if (err?.message === 'Admin user not found for this company') {
            return NextResponse.json({ code: 0, message: err.message }, { status: 404 });
        }
        return internalError(E.SV001, err);
    }
}
