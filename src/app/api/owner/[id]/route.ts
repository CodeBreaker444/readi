import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteOwner, updateOwner } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';
import z from 'zod';

const editOwnerValidation = z.object({
    owner_name: z.string().min(2, "Organization name must be at least 2 characters"),
    owner_email: z.string().email("Invalid email format"),
    owner_website: z.string().url("Invalid website URL"),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);

        if (session.user.role !== 'SUPERADMIN') {
            return forbidden(E.PX004);
        }

        const { id } = await params;
        const body = await req.json();
        const validation = editOwnerValidation.safeParse(body);

        if (!validation.success) {
            const errorMessages = validation.error;
            return NextResponse.json({ code: 0, message: `Validation error: ${errorMessages}` }, { status: 400 });
        }

        const data = await updateOwner(id, body);

        logEvent({
            eventType: 'UPDATE',
            entityType: 'company',
            entityId: id,
            description: `Updated company ID ${id}`,
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
        const deletedByUserId = session?.user?.id

        if (!session) return unauthorized(E.AU001);

        if (session.user.role !== 'SUPERADMIN') {
            return forbidden(E.PX004);
        }

        await deleteOwner(id, Number(deletedByUserId));

        logEvent({
            eventType: 'DELETE',
            entityType: 'company',
            entityId: id,
            description: `Deactivated company ID ${id}`,
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