import { internalError, notFound, unauthorized, forbidden } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { getUserSession } from '@/lib/auth/server-session';
import { resendAdminActivationEmail } from '@/backend/services/company/owner-service';
import { NextResponse } from 'next/server';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getUserSession();
        if (!session) return unauthorized(E.AU001);
        if (session.user.role !== 'SUPERADMIN') return forbidden(E.PX004);

        const { id } = await params;

        const result = await resendAdminActivationEmail(id);

        return NextResponse.json({ 
            code: 1, 
            message: result.message 
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send activation email';
        
        // Handle specific error cases
        if (errorMessage === 'Company not found') {
            return notFound(E.NF002);
        }
        if (errorMessage === 'No admin user found for this company' || errorMessage === 'Account is already active') {
            return NextResponse.json({ 
                code: 0, 
                error: errorMessage,
                errorCode: E.BL005.code 
            }, { status: 400 });
        }
        
        return internalError(E.SV001, err);
    }
}