import { getClientPortalDashboard } from '@/backend/services/client/client-portal-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { clientId, ownerId } = session!.user;

    if (!clientId) {
      return NextResponse.json({ error: 'No client associated with this account' }, { status: 400 });
    }

    const data = await getClientPortalDashboard(clientId, ownerId);
    return NextResponse.json(data);
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
