import { fetchFlytrelayGutma } from '@/backend/services/integrations/flytrelay-flights-service';
import { getAllUserFlytbaseCredentials, getOrganizationCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseGutma(flightId: string, gutma: any): Record<string, any> {
  const message = gutma?.gutma?.exchange?.message ?? {};
  const flightData = message?.flight_data ?? {};
  const logging = message?.flight_logging ?? {};

  const keys: string[] = logging?.flight_logging_keys ?? [];
  const items: any[][] = logging?.flight_logging_items ?? [];
  const col = (key: string) => keys.indexOf(key);

  const tsIdx = col('timestamp');
  const lonIdx = col('gps_lon');
  const latIdx = col('gps_lat');
  const altIdx = col('gps_altitude');
  const vxIdx = col('speed_vx');
  const vyIdx = col('speed_vy');
  const vzIdx = col('speed_vz');
  const headingIdx = col('angle_psi');
  const batteryIdx = col('battery_percent');
  const phiIdx = col('angle_phi');
  const thetaIdx = col('angle_theta');

  const waypoints = items.slice(0, 500).map((row) => {
    const vx = vxIdx >= 0 ? (row[vxIdx] ?? 0) : 0;
    const vy = vyIdx >= 0 ? (row[vyIdx] ?? 0) : 0;
    const vz = vzIdx >= 0 ? (row[vzIdx] ?? 0) : 0;
    return {
      timestamp: tsIdx >= 0 ? row[tsIdx] : undefined,
      latitude: latIdx >= 0 ? row[latIdx] : undefined,
      longitude: lonIdx >= 0 ? row[lonIdx] : undefined,
      altitude: altIdx >= 0 ? row[altIdx] : undefined,
      speed: Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100,
      heading: headingIdx >= 0 ? row[headingIdx] : undefined,
      battery: batteryIdx >= 0 ? row[batteryIdx] : undefined,
      speed_vx: vxIdx >= 0 ? row[vxIdx] : undefined,
      speed_vy: vyIdx >= 0 ? row[vyIdx] : undefined,
      speed_vz: vzIdx >= 0 ? row[vzIdx] : undefined,
      angle_phi: phiIdx >= 0 ? row[phiIdx] : undefined,
      angle_theta: thetaIdx >= 0 ? row[thetaIdx] : undefined,
    };
  });

  let battery_charge_start: number | null = null;
  let battery_charge_end: number | null = null;
  if (batteryIdx >= 0 && items.length > 0) {
    const first = items[0][batteryIdx];
    const last = items[items.length - 1][batteryIdx];
    if (first != null) battery_charge_start = Math.round(Number(first));
    if (last != null) battery_charge_end = Math.round(Number(last));
  }

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
    flight_id: flightId,
    filename: `FlytRelay_Export_${flightId}.gutma`,
    aircraft: flightData?.aircraft ?? {},
    gcs: flightData?.gcs ?? {},
    payload: flightData?.payload ?? [],
    pilot: flightData?.pilot_in_command ?? null,
    logging_start: loggingStart,
    events: logging?.events ?? [],
    waypoints,
    total_waypoints: items.length,
    distance_m,
    start_time,
    end_time,
    battery_charge_start,
    battery_charge_end,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireAuth();
    if (error) return error;

    const flightId = req.nextUrl.searchParams.get('flightId');
    const organizationIdParam = req.nextUrl.searchParams.get('organizationId');
    if (!flightId) {
      return NextResponse.json({ success: false, message: 'flightId is required' }, { status: 400 });
    }

    let organizations;

    if (organizationIdParam) {
      const organizationId = parseInt(organizationIdParam, 10);
      if (isNaN(organizationId)) {
        return NextResponse.json(
          { success: false, message: 'Invalid organization ID' },
          { status: 400 },
        );
      }
      const orgCreds = await getOrganizationCredentials(organizationId);
      if (!orgCreds) {
        return NextResponse.json(
          { success: false, message: 'Organization not found or has no credentials' },
          { status: 404 },
        );
      }
      organizations = [{ orgId: orgCreds.orgId, token: orgCreds.token }];
    } else {
      // Try to get multiple organization credentials first
      const multiOrgCreds = await getAllUserFlytbaseCredentials(session!.user.userId);
      organizations = multiOrgCreds.length > 0 ? multiOrgCreds.map(cred => ({
        orgId: cred.orgId,
        token: cred.token,
      })) : undefined;
    }

    const rawData = await fetchFlytrelayGutma(
      String(session!.user.userId),
      flightId,
      session!.user.ownerId ? String(session!.user.ownerId) : undefined,
      organizations,
    );

    const data = parseGutma(flightId, rawData);
    // console.log('parsed gutma data:', data);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[GET /api/flytrelay/flights/gutma]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
