import { logEvent } from '@/backend/services/auditLog/audit-log';
import { deleteOwnerLogo, uploadOwnerLogo } from '@/backend/services/company/owner-service';
import { forbidden, internalError, unauthorized } from '@/lib/api-error';
import { getUserSession } from '@/lib/auth/server-session';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const ownerId = parseInt(id);

        const formData = await req.formData();
        const logoEntry = formData.get('logo');

        if (!logoEntry || !(logoEntry instanceof File) || logoEntry.size === 0) {
            return NextResponse.json({ code: 0, message: 'Logo file is required' }, { status: 400 });
        }
        if (logoEntry.size > MAX_SIZE) {
            return NextResponse.json({ code: 0, message: 'Logo file must be under 5MB' }, { status: 400 });
        }
        if (!ALLOWED_TYPES.includes(logoEntry.type)) {
            return NextResponse.json({ code: 0, message: 'Logo must be JPEG, PNG, or WebP' }, { status: 400 });
        }

        const { logoUrl } = await uploadOwnerLogo(ownerId, logoEntry);

        logEvent({
            eventType: 'UPDATE',
            entityType: 'company',
            entityId: id,
            description: `Updated company logo (ID ${id})`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
        });

        return NextResponse.json({ code: 1, message: 'Logo updated', logoUrl });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const ownerId = parseInt(id);

        await deleteOwnerLogo(ownerId);

        logEvent({
            eventType: 'UPDATE',
            entityType: 'company',
            entityId: id,
            description: `Removed company logo (ID ${id})`,
            userId: session.user.userId,
            userName: session.user.fullname,
            userEmail: session.user.email,
            userRole: session.user.role,
            ownerId: session.user.ownerId,
        });

        return NextResponse.json({ code: 1, message: 'Logo removed' });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
