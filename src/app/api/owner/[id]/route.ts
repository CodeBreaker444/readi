import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteOwner, updateOwner } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
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
        if (!session) return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });

        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ code: 0, message: "Forbidden" }, { status: 403 });
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

    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getUserSession();
        const deletedByUserId = session?.user?.id

        if (!session) return NextResponse.json({ code: 0, message: "Unauthorized" }, { status: 401 });

        if (session.user.role !== 'SUPERADMIN') {
            return NextResponse.json({ code: 0, message: "Forbidden" }, { status: 403 });
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
        
    } catch (err: any) {
        return NextResponse.json({ code: 0, message: err.message }, { status: 500 });
    }
}