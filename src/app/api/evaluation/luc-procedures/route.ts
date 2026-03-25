import { getLucProcedureList } from '@/backend/services/planning/evaluation-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const { session, error } = await requirePermission('view_planning');
    if (error) return error;

    const sector = searchParams.get('sector') ?? undefined;
    const procedures = await getLucProcedureList(session!.user.ownerId, sector);

    return NextResponse.json({ code: 1, dataRows: procedures.length, data: procedures });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}