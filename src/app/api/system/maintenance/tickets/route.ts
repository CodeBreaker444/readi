import { getTicketList } from '@/backend/services/system/maintenance-ticket';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    
    if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ status: 'ERROR', message: 'Unauthorized' }, { status: 401 });
    }
    const owner_id = session.user.ownerId;

    const tickets = await getTicketList(owner_id);
    return NextResponse.json({ status: 'OK', tickets });
  } catch (err: any) {
    console.error('[GET /api/maintenance/tickets]', err);
    return NextResponse.json({ status: 'ERROR', message: err.message }, { status: 500 });
  }
}