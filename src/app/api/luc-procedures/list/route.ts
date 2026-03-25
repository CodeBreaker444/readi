import { getLUCProceduresList } from '@/backend/services/planning/lucProcedures';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector') || undefined;

    const ownerId = session!.user.ownerId;
    const result = await getLUCProceduresList(ownerId, sector);

    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}