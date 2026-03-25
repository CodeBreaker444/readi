import { getSHITrend } from '@/backend/services/dashboard/dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_dashboard');
    if (error) return error;

    const result = await getSHITrend({
      owner_id: session!.user.ownerId,
      user_id: session!.user.userId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { code: 0, status: 'ERROR', message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
