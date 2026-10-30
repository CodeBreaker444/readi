import { updateSupportAdmin } from '@/backend/services/company/support-admin';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { forbidden, internalError, unauthorized } from '@/lib/api-error';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import z from 'zod';

const schema = z
    .object({
        access_code: z.string().regex(/^\d{6}$/, 'Access code must be exactly 6 digits').optional(),
        new_password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain an uppercase letter')
            .regex(/[0-9]/, 'Password must contain a number')
            .regex(/[^A-Za-z0-9]/, 'Password must contain a special character')
            .optional(),
    })
    .refine((v) => v.access_code || v.new_password, { message: 'Provide a new access code or password' })
    .refine((v) => !(v.access_code && v.new_password), { message: 'Update the access code and the password separately' });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) {
            const msg = parsed.error.issues.map((i) => i.message).join(', ');
            return NextResponse.json({ code: 0, message: msg }, { status: 400 });
        }

        const ownerId = parseInt(id);
        const result = await updateSupportAdmin(ownerId, {
            accessCode: parsed.data.access_code,
            password: parsed.data.new_password,
        });

        logEvent({
            eventType: 'UPDATE',
            entityType: 'company',
            entityId: ownerId,
            description: 'Updated support admin credentials',
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
        });

        return NextResponse.json({ code: 1, message: 'Support access updated', data: result });
    } catch (err: any) {
        if (err?.message === 'Access code is already in use') {
            return NextResponse.json({ code: 0, message: err.message }, { status: 409 });
        }
        return internalError(E.SV001, err);
    }
}
