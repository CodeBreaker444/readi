import { gutmaArchiveAndSync } from '@/backend/services/integrations/gutma-sync-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function gutmaFilename(flightId: string, preview?: any): string {
  return preview?.filename ?? `FlytBase_Export_${flightId}.gutma`;
}

function s3Key(filename: string): string {
  return `flytbase/gutma/${filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const { flightId, preview } = body as { flightId?: string; preview?: any };

    if (!flightId || !preview) {
      return NextResponse.json(
        { success: false, message: 'flightId and preview are required' },
        { status: 400 },
      );
    }

    const key = s3Key(gutmaFilename(flightId, preview));
    const result = await gutmaArchiveAndSync(
      session!.user.ownerId,
      { ...preview, flight_id: flightId },
      key,
    );

    if (!result.success) {
      const isMissingSns = result.missing_sns?.[0] === '__no_sns__';
      return NextResponse.json(
        {
          success: false,
          code: 'SN_MISMATCH',
          message: isMissingSns
            ? 'No serial numbers found in this GUTMA file. Cannot identify equipment.'
            : 'Archiving not possible — the following serial numbers are not registered in the system.',
          missing_sns: isMissingSns ? [] : (result.missing_sns ?? []),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Flight log archived and equipment records updated.',
      s3_key: result.s3_key,
      duration_seconds: result.duration_seconds,
      updated_components: result.updated_components,
      mission_synced: result.mission_synced,
    });
  } catch (err) {
    return internalError(E.SV001, err);
  }
}
