import { getSPIKPIData } from '@/backend/services/dashboard/dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_dashboard');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const userId = session!.user.userId;
    const result = await getSPIKPIData({ owner_id: ownerId, user_id: userId });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[GET /api/operation/communication/recipients]', error);
    return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 });
  }
}
