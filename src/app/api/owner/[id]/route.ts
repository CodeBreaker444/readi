import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteOwner, getOwnerById, updateOwner } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
import { apiError, forbidden, internalError, notFound, unauthorized, zodError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import z from 'zod';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const owner = await getOwnerById(id);
        if (!owner) return notFound(E.NF002);

        return NextResponse.json({ code: 1, data: owner });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}

const editOwnerValidation = z.object({
    owner_name: z.string().min(2, 'Organization name must be at least 2 characters'),
    owner_legal_name: z.string().optional().nullable(),
    owner_type: z.string().optional().nullable(),
    owner_email: z.string().email('Invalid email format'),
    owner_phone: z.string().optional().nullable(),
    owner_website: z.string().url('Invalid website URL'),
    owner_address: z.string().optional().nullable(),
    owner_city: z.string().optional().nullable(),
    owner_state: z.string().optional().nullable(),
    owner_postal_code: z.string().optional().nullable(),
    owner_active: z.enum(['Y', 'N']),
    drone_atc_enabled: z.boolean().optional(),
    email_notifications_enabled: z.boolean().optional(),
    easa_operator_code: z.string().max(100).optional().nullable(),
    tax_id: z.string().optional().nullable(),
    registration_number: z.string().optional().nullable(),
    license_number: z.string().optional().nullable(),
    license_expiry: z.string().optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const body = await req.json();
        const validation = editOwnerValidation.safeParse(body);

        if (!validation.success) return zodError(E.VL001, validation.error);

        const data = await updateOwner(id, validation.data);

        logEvent({
            eventType: 'UPDATE',
            entityType: 'company',
            entityId: id,
            description: `Updated company '${body.owner_name}' (ID ${id})`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
            metadata: { owner_name: body.owner_name },
        });

        return NextResponse.json({ code: 1, message: 'Updated', data });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getUserSession();
        const deletedByUserId = session?.user?.id;

        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        if (id === '1') {
            return apiError(E.BL004, 403);
        }

        const ownerInfo = await getOwnerById(id);
        await deleteOwner(id, Number(deletedByUserId));

        logEvent({
            eventType: 'DELETE',
            entityType: 'company',
            entityId: id,
            description: `Deactivated company '${ownerInfo?.owner_name ?? `#${id}`}' (ID ${id})`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
        });

        return NextResponse.json({ code: 1, message: 'Company deactivated and archived' });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
