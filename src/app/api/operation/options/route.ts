import { getMissionCategoryOptions, getMissionTypeOptions, getPilotOptions, getPlanningOptions, getToolOptions } from '@/backend/services/operation/operation-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await getUserSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ownerId = session.user.ownerId

    try {
        const [pilots, tools, types, categories, plannings] = await Promise.all([
            getPilotOptions(ownerId),
            getToolOptions(ownerId),
            getMissionTypeOptions(ownerId),
            getMissionCategoryOptions(ownerId),
            getPlanningOptions(ownerId),
        ]);

        return NextResponse.json({
            pilots,
            tools,
            types,
            categories,
            plannings,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}