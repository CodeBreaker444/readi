import { getSuperAdminOverview } from '@/backend/services/superadmin/superadmin-service';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const data = await getSuperAdminOverview();
        return NextResponse.json({ code: 1, data });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
