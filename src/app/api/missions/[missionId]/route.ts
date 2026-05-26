import { cancelFlightRequestByExternalId } from '@/backend/services/mission/flight-request-service';
import { internalError } from '@/lib/api-error';
import { requireApiKey } from '@/lib/auth/api-key-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ missionId: string }> },
) {
  try {
    const { session, error } = await requireApiKey(req);
    if (error) return error;

    const { missionId } = await params;

    const result = await cancelFlightRequestByExternalId(missionId, session!.owner_id);

    if (result === 'not_found') {
      return NextResponse.json(
        { code: 0, status: 'ERROR', message: `Mission '${missionId}' not found` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      message: result === 'already_cancelled'
        ? `Mission '${missionId}' was already cancelled`
        : `Mission '${missionId}' cancelled`,
      missionId,
    });
  } catch (err) {
    console.error('[DELETE /api/missions/:missionId]', err);
    return internalError(E.SV001, err);
  }
}