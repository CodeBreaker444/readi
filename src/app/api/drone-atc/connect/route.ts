import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { connectToFlytrelay } from '@/lib/flytrelay.service';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session!.user.userId;

    const creds = await getFlytbaseCredentials(userId);
    if (!creds) {
      return NextResponse.json({ hasFlytbaseKey: false }, { status: 200 });
    }

    const connection = await connectToFlytrelay(String(userId));

    return NextResponse.json({
      hasFlytbaseKey: true,
      wsUrl: connection.wsUrl,
      topic: connection.topic,
    });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
