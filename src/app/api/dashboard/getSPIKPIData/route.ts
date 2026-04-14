import { getSPIKPIData } from '@/backend/services/dashboard/dashboard';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_dashboard');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const userId = session!.user.userId;
    const result = await getSPIKPIData({ owner_id: ownerId, user_id: userId });
    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
