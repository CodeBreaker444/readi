import { getSystemList } from '@/backend/services/system/system-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const body = await request.json();
    const isSuperAdmin = session!.user.role === 'SUPERADMIN';
    const ownerId = isSuperAdmin ? (body.o_id || session!.user.ownerId) : session!.user.ownerId;
    const clientId = body.client_id;
    const active = body.active || 'ALL';

    const result = await getSystemList(ownerId, clientId, active);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}