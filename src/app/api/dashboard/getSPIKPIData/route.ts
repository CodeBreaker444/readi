import { getSPIKPIData } from '@/backend/services/dashboard/dashboard';
import { getUserSession } from '@/lib/auth/server-session';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if(!session)
    {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const ownerId = session.user.ownerId
    const userId = session.user.userId
    const result = await getSPIKPIData({owner_id:ownerId,user_id: userId});
    return NextResponse.json(result);

  } catch (error: any) {
      console.error('[GET /api/operation/communication/recipients]', error);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
}
}