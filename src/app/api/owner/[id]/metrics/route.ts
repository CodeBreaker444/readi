import { getOwnerMetrics } from '@/backend/services/company/owner-service';
import { getUserSession } from '@/lib/auth/server-session';
import { internalError, unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;
        const metrics = await getOwnerMetrics(id);

        return NextResponse.json({ code: 1, data: metrics });
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
