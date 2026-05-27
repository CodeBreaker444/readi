import { cancelFlightRequestByExternalId } from '@/backend/services/mission/flight-request-service';
import { internalError } from '@/lib/api-error';
import { requireApiKey } from '@/lib/auth/api-key-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const MAX_BATCH = 4;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireApiKey(req);
    if (error) return error;

    const { id } = await params;

    let missionIds: string[] = [id];

    const contentType = req.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => null);
      if (body?.missionIds != null) {
        if (!Array.isArray(body.missionIds) || body.missionIds.length === 0) {
          return NextResponse.json(
            { code: 0, status: 'ERROR', message: 'missionIds must be a non-empty array' },
            { status: 400 },
          );
        }
        if (body.missionIds.length > MAX_BATCH) {
          return NextResponse.json(
            { code: 0, status: 'ERROR', message: `Maximum ${MAX_BATCH} missions can be deleted at once` },
            { status: 400 },
          );
        }
        missionIds = body.missionIds;
      }
    }

    const results = await Promise.all(
      missionIds.map(async (missionId) => {
        const result = await cancelFlightRequestByExternalId(missionId, session!.owner_id);
        return { missionId, result };
      }),
    );

    // Single-mission: preserve original response shape for backward compatibility
    if (missionIds.length === 1) {
      const { missionId, result } = results[0];
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
    }

    // Batch: return per-mission results
    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      results: results.map(({ missionId, result }) => ({
        missionId,
        status: result,
        message: result === 'not_found'
          ? `Mission '${missionId}' not found`
          : result === 'already_cancelled'
          ? `Mission '${missionId}' was already cancelled`
          : `Mission '${missionId}' cancelled`,
      })),
    });
  } catch (err) {
    console.error('[DELETE /api/missions/:id]', err);
    return internalError(E.SV001, err);
  }
}
