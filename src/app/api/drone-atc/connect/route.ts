import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { internalError } from '@/lib/api-error';
import { requireAuth } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { connectToFlytrelay } from '@/lib/flytrelay.service';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const userId = session!.user.userId;

    const creds = await getFlytbaseCredentials(userId);
    if (!creds) {
      return NextResponse.json({ hasFlytbaseKey: false }, { status: 404 });
    }

    const connection = await connectToFlytrelay(String(userId), creds.token);

    return NextResponse.json({
      hasFlytbaseKey: true,
      wsUrl: connection.wsUrl,
      topic: connection.topic,
      token: connection.token,
    });
  } catch (err) {
    console.error('[POST /api/drone-atc/connect]', err);
    return internalError(E.SV001, err);
  }
}
