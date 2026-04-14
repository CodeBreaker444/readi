
import { getComplianceStats } from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';
import { apiError, internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
export async function GET() {
    try {
        const { session, error } = await requirePermission('view_compliance');
        if (error) return error;

        const ownerId = session!.user.ownerId;
        if (!ownerId) {
            return apiError(E.AU003, 403);
        }

        const stats = await getComplianceStats(ownerId);
        return NextResponse.json({ code: 1, message: 'Success', data: stats });
    } catch (error: any) {
        console.error('[compliance/stats] error:', error);
        return internalError(E.AU002, error);
    }
}