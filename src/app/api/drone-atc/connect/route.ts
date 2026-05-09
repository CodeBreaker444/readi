import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { supabase } from '@/backend/database/database';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { connectToFlytrelay } from '@/lib/flytrelay-service';
import { NextResponse } from 'next/server';

const ADMIN_ROLES = new Set(['SUPERADMIN', 'ADMIN']);

export async function POST() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const { userId, role, ownerId } = session!.user;
    const isAdmin = ADMIN_ROLES.has(role);

    if (!isAdmin) {
      const creds = await getFlytbaseCredentials(userId);
      if (!creds) return NextResponse.json({ hasFlytbaseKey: false });
      const conn = await connectToFlytrelay(String(userId), creds.token, creds.orgId, String(ownerId));
      return NextResponse.json({ hasFlytbaseKey: true, connections: [conn] });
    }

    // Admin/Superadmin: fetch all active users in the same company with FlytBase creds
    const { data: users, error: dbError } = await supabase
      .from('users')
      .select('user_id, flytbase_api_token, flytbase_org_id')
      .eq('fk_owner_id', ownerId)
      .eq('user_active', 'Y')
      .not('flytbase_api_token', 'is', null)
      .not('flytbase_org_id', 'is', null);

    if (dbError) throw new Error(dbError.message);

    if (!users?.length) {
      return NextResponse.json({ hasFlytbaseKey: false });
    }

    // Connect to FlytRelay for all company users in parallel
    const results = await Promise.allSettled(
      users.map(u =>
        connectToFlytrelay(
          String(u.user_id),
          (u.flytbase_api_token as string).trim(),
          (u.flytbase_org_id as string).trim(),
          String(ownerId),
        ),
      ),
    );

    const connections = results
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof connectToFlytrelay>>> =>
        r.status === 'fulfilled',
      )
      .map(r => r.value);

    const failedCount = results.filter(r => r.status === 'rejected').length;
    if (failedCount > 0) {
      console.warn(`[drone-atc/connect] ${failedCount}/${results.length} FlytRelay connections failed`);
    }

    if (!connections.length) {
      return NextResponse.json({ hasFlytbaseKey: false });
    }

    return NextResponse.json({ hasFlytbaseKey: true, connections });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
