import { getAttachableMissions } from '@/backend/services/operation/mission-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { error, session } = await requirePermission('view_operations');
    if (error) return error;

    const droneSerialNumber = req.nextUrl.searchParams.get('droneSerialNumber');
    if (!droneSerialNumber) {
      return NextResponse.json({ code: 0, message: 'droneSerialNumber is required' }, { status: 400 });
    }

    const ownerId = session?.user?.ownerId;
    if (!ownerId) {
      return NextResponse.json({ code: 0, message: 'ownerId is required' }, { status: 400 });
    }

    const missions = await getAttachableMissions(droneSerialNumber, Number(ownerId));

    return NextResponse.json({ code: 1, data: missions });
  } catch (err) {
    console.error('[GET /api/operation/missions/attachable]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ code: 0, message }, { status: 500 });
  }
}