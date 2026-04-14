import { getMissionStatusList } from '@/backend/services/mission/status-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const result = await getMissionStatusList(ownerId);

    return NextResponse.json(result);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
