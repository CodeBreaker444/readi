import { listDFlightUspaces } from '@/backend/services/integrations/dflight-mission-authorization-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;

    try {
        const result = await listDFlightUspaces(ownerId);
        return NextResponse.json(result);
    } catch (err) {
        return internalError(E.SV001, err);
    }
}
