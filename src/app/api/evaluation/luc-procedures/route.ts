import { getLucProcedureList } from '@/backend/services/planning/evaluation-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
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
    return internalError(E.SV001, err)
  }
}