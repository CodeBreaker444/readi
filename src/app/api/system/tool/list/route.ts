import { getToolList } from '@/backend/services/system/tool/tool-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ownerId = body.o_id || session.user.ownerId;
    const clientId = body.client_id;
    const active = body.active || 'ALL';
    const status = body.status || 'ALL';

    const result = await getToolList(ownerId, clientId, active, status);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message },
      { status: 500 }
    );
  }
}