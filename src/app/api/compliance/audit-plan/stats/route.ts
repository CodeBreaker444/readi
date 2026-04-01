
import { getComplianceStats } from '@/backend/services/compliance/compliance-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { session, error } = await requirePermission('view_compliance');
        if (error) return error;

        const ownerId = session!.user.ownerId;
        if (!ownerId) {
            return NextResponse.json({ code: 0, error: 'Owner not found in session' }, { status: 403 });
        }

        const stats = await getComplianceStats(ownerId);
        return NextResponse.json({ code: 1, message: 'Success', data: stats });
    } catch (err) {
        console.error('[compliance/stats] error:', err);
        return NextResponse.json({ code: 0, error: 'Internal server error' }, { status: 500 });
    }
}