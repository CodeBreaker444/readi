import { fetchUsers } from '@/backend/services/operation/communication-service';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
        const session = await getUserSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownerId: number = session.user.ownerId
    const { searchParams } = new URL(req.url);
    const procedure = searchParams.get('procedure') ?? 'operation';

   const data = await fetchUsers(ownerId)

    const recipients = (data ?? []).map((u: any) => ({
      id: u.user_id,
      text: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
        + (u.user_role ? ` (${u.user_role})` : ''),
    }));

    return NextResponse.json({ recipients, procedure });
  } catch (err: any) {
    console.error('[GET /api/operation/communication/recipients]', err);
    return NextResponse.json({ error: err?.message ?? 'Error' }, { status: 500 });
  }
}