import { getLUCProceduresList } from '@/backend/services/planning/lucProcedures';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector') || undefined;

    const ownerId = session!.user.ownerId;
    const result = await getLUCProceduresList(ownerId, sector);

    return NextResponse.json({
      code: 1,
      message: 'Procedures list fetched successfully',
      data: result.procedures,
      dataRows: result.procedures.length,
    });
  } catch (error) {
    return internalError(E.SV001, error);
  }
}