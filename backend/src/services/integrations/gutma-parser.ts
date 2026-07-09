export interface GutmaWaypoint {
  timestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  speed_vx?: number;
  speed_vy?: number;
  speed_vz?: number;
  angle_phi?: number;
  angle_theta?: number;
}

export interface ParsedGutmaFlight {
  aircraft: Record<string, any>;
  gcs: Record<string, any>;
  payload: Array<Record<string, any>>;
  pilot: string | null;
  start_time: string | null;
  end_time: string | null;
  distance_m: number | null;
  battery_charge_start: number | null;
  battery_charge_end: number | null;
  waypoints: GutmaWaypoint[];
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Parses a raw FlytBase/FlytRelay GUTMA export (`exchange.message.flight_data` /
 * `flight_logging`) into the fields relevant for mission post-flight sync.
 */
export function parseGutmaFlightData(gutma: any): ParsedGutmaFlight {
  const message = gutma?.exchange?.message ?? gutma?.gutma?.exchange?.message ?? {};
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

  const loggingStart = logging?.logging_start_dtg ?? null;
  const start_time =
    flightData?.start_time ??
    flightData?.start_dtg ??
    message?.start_time ??
    loggingStart ??
    null;

  let end_time =
    flightData?.end_time ??
    flightData?.end_dtg ??
    message?.end_time ??
    null;

  // GUTMA `timestamp` values are seconds elapsed since logging_start_dtg, not
  // absolute time — when no explicit end field is present, derive it from the
  // last logged row instead of leaving end_time null.
  if (!end_time && start_time && tsIdx >= 0 && items.length > 0) {
    const lastTs = Number(items[items.length - 1][tsIdx]);
    const startMs = new Date(start_time).getTime();
    if (!isNaN(lastTs) && lastTs >= 0 && !isNaN(startMs)) {
      end_time = new Date(startMs + lastTs * 1000).toISOString();
    }
  }

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

  const waypoints: GutmaWaypoint[] = items.map((row) => {
    const vx = vxIdx >= 0 ? (row[vxIdx] ?? 0) : 0;
    const vy = vyIdx >= 0 ? (row[vyIdx] ?? 0) : 0;
    const vz = vzIdx >= 0 ? (row[vzIdx] ?? 0) : 0;
    return {
      timestamp:   tsIdx      >= 0 ? row[tsIdx]      : undefined,
      latitude:    latIdx     >= 0 ? row[latIdx]     : undefined,
      longitude:   lonIdx     >= 0 ? row[lonIdx]     : undefined,
      altitude:    altIdx     >= 0 ? row[altIdx]     : undefined,
      speed:       Math.round(Math.sqrt(vx * vx + vy * vy + vz * vz) * 100) / 100,
      heading:     headingIdx >= 0 ? row[headingIdx] : undefined,
      battery:     batteryIdx >= 0 ? row[batteryIdx] : undefined,
      speed_vx:    vxIdx      >= 0 ? row[vxIdx]      : undefined,
      speed_vy:    vyIdx      >= 0 ? row[vyIdx]      : undefined,
      speed_vz:    vzIdx      >= 0 ? row[vzIdx]      : undefined,
      angle_phi:   phiIdx     >= 0 ? row[phiIdx]     : undefined,
      angle_theta: thetaIdx   >= 0 ? row[thetaIdx]   : undefined,
    };
  });

  return {
    aircraft: flightData?.aircraft ?? {},
    gcs: flightData?.gcs ?? {},
    payload: flightData?.payload ?? [],
    pilot: flightData?.pilot_in_command ?? null,
    start_time,
    end_time,
    distance_m,
    battery_charge_start,
    battery_charge_end,
    waypoints,
  };
}

export interface ParsedGutmaFlightPreview extends Omit<ParsedGutmaFlight, 'waypoints'> {
  flight_id: string;
  filename: string;
  logging_start: string | null;
  events: any[];
  waypoints: GutmaWaypoint[];
  total_waypoints: number;
}

/**
 * Same underlying GUTMA structure as parseGutmaFlightData, but shaped for the
 * flight-log preview UI (GutmaPreviewPanel): adds flight_id/filename/events/
 * logging_start and caps the returned waypoint list (full count still reported
 * via total_waypoints) instead of trimming fields down to post-flight-sync needs.
 */
export function parseGutmaFlightPreview(flightId: string, gutma: any): ParsedGutmaFlightPreview {
  const message = gutma?.exchange?.message ?? gutma?.gutma?.exchange?.message ?? {};
  const logging = message?.flight_logging ?? {};

  const parsed = parseGutmaFlightData(gutma);
  const items: any[][] = logging?.flight_logging_items ?? [];

  return {
    flight_id: flightId,
    filename: gutma?.file?.filename ?? `FlytBase_Export_${flightId}.gutma`,
    aircraft: parsed.aircraft,
    gcs: parsed.gcs,
    payload: parsed.payload,
    pilot: parsed.pilot,
    logging_start: logging?.logging_start_dtg ?? null,
    events: logging?.events ?? [],
    waypoints: parsed.waypoints.slice(0, 500),
    total_waypoints: items.length,
    start_time: parsed.start_time,
    end_time: parsed.end_time,
    distance_m: parsed.distance_m,
    battery_charge_start: parsed.battery_charge_start,
    battery_charge_end: parsed.battery_charge_end,
  };
}
