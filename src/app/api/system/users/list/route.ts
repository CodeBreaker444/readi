import { getOwnerUsersForAlerts } from '@/backend/services/system/system-service';
import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requirePermission('view_config');
    if (error) return error;

    const users = await getOwnerUsersForAlerts(session!.user.ownerId);

    return NextResponse.json({ code: 1, data: users });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
