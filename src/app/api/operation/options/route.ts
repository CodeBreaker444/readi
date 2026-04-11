import { getLucProcedureOptions, getMissionCategoryOptions, getMissionTypeOptions, getPilotOptions, getPlanningOptions, getToolOptions } from '@/backend/services/operation/operation-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextResponse } from 'next/server';

export async function GET() {

    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId

    try {
        const [pilots, tools, types, categories, plannings, lucProcedures] = await Promise.all([
            getPilotOptions(ownerId),
            getToolOptions(ownerId),
            getMissionTypeOptions(ownerId),
            getMissionCategoryOptions(ownerId),
            getPlanningOptions(ownerId),
            getLucProcedureOptions(ownerId),
        ]);

        return NextResponse.json({
            pilots,
            tools,
            types,
            categories,
            plannings,
            lucProcedures,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}