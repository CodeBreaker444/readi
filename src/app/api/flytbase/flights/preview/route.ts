import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { BUCKET, getPresignedDownloadUrl, getPresignedUploadUrl, s3 } from '@/lib/s3Client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function gutmaFilename(flightId: string, gutma?: any): string {
  return gutma?.file?.filename ?? `FlytBase_Export_${flightId}.gutma`;
}

function s3Key(filename: string) {
  return `flytbase/gutma/${filename}`;
}

async function existsInS3(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseGutma(flightId: string, gutma: any): Record<string, any> {
  const message    = gutma?.exchange?.message ?? {};
  const flightData = message?.flight_data ?? {};
  const logging    = message?.flight_logging ?? {};

  const keys: string[] = logging?.flight_logging_keys ?? [];
  const items: any[][] = logging?.flight_logging_items ?? [];
  const col = (key: string) => keys.indexOf(key);

  const tsIdx      = col('timestamp');
  const lonIdx     = col('gps_lon');
  const latIdx     = col('gps_lat');
  const altIdx     = col('gps_altitude');
  const vxIdx      = col('speed_vx');
  const vyIdx      = col('speed_vy');
  const vzIdx      = col('speed_vz');
  const headingIdx = col('angle_psi');
  const batteryIdx = col('battery_percent');
  const phiIdx     = col('angle_phi');
  const thetaIdx   = col('angle_theta');

  const waypoints = items.slice(0, 500).map((row) => {
    const vx = vxIdx >= 0 ? (row[vxIdx] ?? 0) : 0;
    const vy = vyIdx >= 0 ? (row[vyIdx] ?? 0) : 0;
    const vz = vzIdx >= 0 ? (row[vzIdx] ?? 0) : 0;
    return {
      timestamp:   tsIdx    >= 0 ? row[tsIdx]      : undefined,
      latitude:    latIdx   >= 0 ? row[latIdx]     : undefined,
      longitude:   lonIdx   >= 0 ? row[lonIdx]     : undefined,
      altitude:    altIdx   >= 0 ? row[altIdx]     : undefined,
      speed:       Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100,
      heading:     headingIdx >= 0 ? row[headingIdx] : undefined,
      battery:     batteryIdx >= 0 ? row[batteryIdx] : undefined,
      speed_vx:    vxIdx    >= 0 ? row[vxIdx]     : undefined,
      speed_vy:    vyIdx    >= 0 ? row[vyIdx]     : undefined,
      speed_vz:    vzIdx    >= 0 ? row[vzIdx]     : undefined,
      angle_phi:   phiIdx   >= 0 ? row[phiIdx]    : undefined,
      angle_theta: thetaIdx >= 0 ? row[thetaIdx]  : undefined,
    };
  });

  // Compute total distance in metres from all GPS points (not just the 500-item waypoint slice)
  let distance_m: number | null = null;
  if (latIdx >= 0 && lonIdx >= 0 && items.length > 1) {
    let total = 0;
    for (let i = 1; i < items.length; i++) {
      const lat1 = items[i - 1][latIdx];
      const lon1 = items[i - 1][lonIdx];
      const lat2 = items[i][latIdx];
      const lon2 = items[i][lonIdx];
      if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {
        total += haversineM(lat1, lon1, lat2, lon2);
      }
    }
    if (total > 0) distance_m = Math.round(total);
  }

  // FlytBase GUTMA may use start_dtg/end_dtg instead of start_time/end_time
  const loggingStart = logging?.logging_start_dtg ?? null;
  const start_time =
    flightData?.start_time ??
    flightData?.start_dtg ??
    message?.start_time ??
    loggingStart ??
    null;
  const end_time =
    flightData?.end_time ??
    flightData?.end_dtg ??
    message?.end_time ??
    null;

  return {
    flight_id:       flightId,
    filename:        gutmaFilename(flightId, gutma),
    aircraft:        flightData?.aircraft ?? {},
    gcs:             flightData?.gcs ?? {},
    payload:         flightData?.payload ?? [],
    pilot:           flightData?.pilot_in_command ?? null,
    logging_start:   loggingStart,
    events:          logging?.events ?? [],
    waypoints,
    total_waypoints: items.length,
    distance_m,
    start_time,
    end_time,
  };
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const flightId = req.nextUrl.searchParams.get('flightId');
  // const flightId = '6f5bbd84-2341-4b62-ab4c-852f3a416a0b';
  if (!flightId) {
    return NextResponse.json({ success: false, message: 'flightId is required' }, { status: 400 });
  }

  const creds = await getFlytbaseCredentials(session!.user.userId);
  if (!creds) {
    return NextResponse.json(
      { success: false, message: 'No FlytBase integration configured.' },
      { status: 422 },
    );
  }

  const derivedKey = s3Key(gutmaFilename(flightId));
  const alreadyArchived = await existsInS3(derivedKey);
  if (alreadyArchived) {
    const presignedDownloadUrl = await getPresignedDownloadUrl(derivedKey, 900);
    const cached = await fetch(presignedDownloadUrl);
    const data = await cached.json();
    return NextResponse.json({ success: true, data, fromCache: true });
  }

  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;

  let upstream: Response;
  try {
    upstream = await fetch(gutmaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'org-id': creds.orgId,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err: any) {
    const msg = err?.name === 'TimeoutError'
      ? 'No GUTMA data available for this flight.'
      : 'Failed to reach FlytBase.';
    return NextResponse.json({ success: false, message: msg }, { status: 504 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return NextResponse.json(
      { success: false, message: `FlytBase returned ${upstream.status}: ${errText.slice(0, 200)}` },
      { status: upstream.status },
    );
  }

  let gutma: any;
  try {
    gutma = await upstream.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'GUTMA data unavailable for this flight.' },
      { status: 422 },
    );
  }

  const data = parseGutma(flightId, gutma);
  const key  = s3Key(data.filename);

  const presignedUploadUrl = await getPresignedUploadUrl(key, 'application/json', 600);

  return NextResponse.json({
    success: true,
    data,
    presignedUploadUrl,
    s3Key: key,
    fromCache: false,
  });
}
