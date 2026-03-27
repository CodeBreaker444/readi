'use server';

import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import { decryptToken, encryptToken } from '@/backend/utils/token-encryption';
import JSZip from 'jszip';


export interface FlytbaseUserInfo {
  id: string | number;
  email: string;
  name?: string;
  username?: string;
  phone?: string;
  organization?: string;
}

export interface FlytbaseFlight {
  flight_id: string;
  flight_name?: string;
  /** Unix milliseconds */
  start_time?: number;
  /** Unix milliseconds */
  end_time?: number;
  /** Seconds */
  duration?: number;
  distance?: number;
  drone_name?: string;
  drone_id?: string;
  pilot_name?: string;
  mission_name?: string;
  status?: string;
}

export interface GutmaAircraft {
  serial_number?: string;
  product_name?: string;
  firmware_version?: string;
  model?: string;
  manufacturer?: string;
}

export interface GutmaGcs {
  type?: string;
  name?: string;
  serial_number?: string;
}

export interface GutmaWaypoint {
  timestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface GutmaFlightPreview {
  flight_id: string;
  aircraft?: GutmaAircraft;
  gcs?: GutmaGcs;
  waypoints: GutmaWaypoint[];
  total_waypoints: number;
  start_time?: string;
  end_time?: string;
  raw_filename?: string;
}

/** Encrypt token and persist both token + org-id for the user. */
export async function saveFlytbaseConfig(
  userId: number,
  plainToken: string,
  orgId: string,
): Promise<void> {
  const encrypted = encryptToken(plainToken.trim());

  const { error } = await supabase
    .from('users')
    .update({
      flytbase_api_token: encrypted,
      flytbase_org_id: orgId.trim(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`saveFlytbaseConfig: ${error.message}`);
}

/** Returns whether the user has a FlytBase token + org-id stored. */
export async function hasFlytbaseToken(userId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('flytbase_api_token, flytbase_org_id')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`hasFlytbaseToken: ${error.message}`);
  return !!(data?.flytbase_api_token && data?.flytbase_org_id);
}

/**
 * Decrypts and returns the stored credentials for internal API calls.
 * Never expose the returned token to the client.
 */
export async function getFlytbaseCredentials(
  userId: number,
): Promise<{ token: string; orgId: string } | null> {
  const { data, error } = await supabase
    .from('users')
    .select('flytbase_api_token, flytbase_org_id')
    .eq('user_id', userId)
    .single();

  if (error) throw new Error(`getFlytbaseCredentials: ${error.message}`);
  if (!data?.flytbase_api_token || !data?.flytbase_org_id) return null;

  return {
    token: decryptToken(data.flytbase_api_token),
    orgId: data.flytbase_org_id,
  };
}

/** Remove the stored FlytBase credentials for the given user. */
export async function removeFlytbaseToken(userId: number): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ flytbase_api_token: null, flytbase_org_id: null })
    .eq('user_id', userId);

  if (error) throw new Error(`removeFlytbaseToken: ${error.message}`);
}



function flytbaseHeaders(token: string, orgId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'org-id': orgId,
    'Content-Type': 'application/json',
  };
}

/**
 * Verifies the token is accepted by FlytBase by making a minimal flight-list
 * call. Throws if the credentials are rejected.
 * Returns a FlytbaseUserInfo populated from whatever the API returns.
 */
export async function verifyFlytbaseTokenAndGetUser(
  plainToken: string,
  orgId?: string,
): Promise<FlytbaseUserInfo> {
  if (!orgId?.trim()) {
    throw new Error('Organization ID is required to verify your FlytBase token.');
  }

  const token = plainToken.trim();
  const org = orgId.trim();

  const params = new URLSearchParams({ page: '1', limit: '1', archived: 'false' });
  const response = await fetch(`${env.FLYTBASE_URL}/v2/flight?${params.toString()}`, {
    method: 'GET',
    headers: flytbaseHeaders(token, org),
  });

  const responseText = await response.text();

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid FlytBase API token — authentication failed. Please check your token and Organization ID.');
  }
  if (!response.ok) {
    const isHtml = responseText.trimStart().startsWith('<');
    const detail = isHtml ? `HTTP ${response.status}` : responseText.slice(0, 200);
    throw new Error(`FlytBase API error: ${detail}`);
  }

  try {
    JSON.parse(responseText);
  } catch {
    throw new Error('FlytBase returned an unexpected response. Please try again.');
  }

  const userInfo = extractJwtClaims(token);

  return {
    id: userInfo.sub ?? userInfo.user_id ?? org,
    email: userInfo.email ?? '',
    name: userInfo.name ?? undefined,
    username: userInfo.username ?? undefined,
    organization: org,
  };
}

/** Best-effort JWT payload extraction — does NOT verify the signature. */
function extractJwtClaims(token: string): Record<string, string> {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return {};
  }
}


/**
 * Fetch completed flights from the past `windowMinutes` minutes.
 * Returns the flights sorted newest-first.
 */
export async function fetchRecentFlights(
  token: string,
  orgId: string,
  windowMinutes = 30,
): Promise<{ flights: FlytbaseFlight[]; total: number }> {
  const now = Date.now();
  const startDate = now - windowMinutes * 60 * 1000;

  const params = new URLSearchParams({
    page: '1',
    limit: '50',
    archived: 'false',
    startDate: String(startDate),
    endDate: String(now),
  });

  const response = await fetch(`${env.FLYTBASE_URL}/v2/flight?${params.toString()}`, {
    method: 'GET',
    headers: flytbaseHeaders(token, orgId),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`FlytBase flights API error ${response.status}: ${text}`);
  }

  const body = await response.json();
  const rawFlights: Record<string, unknown>[] = body?.flightLogs ?? [];
  const total: number = (body?.total as { value?: number })?.value ?? rawFlights.length;

  const flights: FlytbaseFlight[] = rawFlights.map((f) => ({
    flight_id: String(f.flight_id ?? ''),
    flight_name: f.flight_name != null ? String(f.flight_name) : undefined,
    start_time: f.start_time != null ? Number(f.start_time) : undefined,
    end_time: f.end_time != null ? Number(f.end_time) : undefined,
    duration: f.duration != null ? Number(f.duration) : undefined,
    distance: f.distance != null ? Number(f.distance) : undefined,
    drone_name: f.drone_name != null ? String(f.drone_name) : undefined,
    drone_id: f.drone_id != null ? String(f.drone_id) : undefined,
    pilot_name: f.pilot_name != null ? String(f.pilot_name) : undefined,
    mission_name: f.mission_name != null ? String(f.mission_name) : undefined,
    status: f.status != null ? String(f.status) : undefined,
  }));

  return { flights, total };
}


/**
 * Download the GUTMA ZIP for a single flight, extract it, and return a
 * structured preview of the first GUTMA file found.
 */
export async function fetchFlightGutmaPreview(
  token: string,
  orgId: string,
  flightId: string,
): Promise<GutmaFlightPreview> {
  const params = new URLSearchParams({ flightIds: flightId });
  const url = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${params.toString()}`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 50_000);  

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: flytbaseHeaders(token, orgId),
      signal: abort.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') {
      throw new Error('FlytBase GUTMA download timed out. The file may be too large — try again.');
    }
    throw err;
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new Error(`GUTMA download failed ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Find the first .json file inside the ZIP
  const jsonEntry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.toLowerCase().endsWith('.json'),
  );

  if (!jsonEntry) {
    throw new Error('No GUTMA JSON file found in the downloaded archive.');
  }

  const jsonText = await jsonEntry.async('string');
  const gutma = JSON.parse(jsonText);

  return parseGutma(flightId, jsonEntry.name, gutma);
}

function parseGutma(
  flightId: string,
  filename: string,
  gutma: Record<string, unknown>,
): GutmaFlightPreview {
  const msg =
    ((gutma as any)?.exchange?.message) ?? {};
  const flightData = msg?.flight_data ?? {};

  const aircraft: GutmaAircraft = {
    serial_number: flightData?.aircraft?.serial_number ?? undefined,
    product_name: flightData?.aircraft?.product_name ?? undefined,
    firmware_version: flightData?.aircraft?.firmware_version ?? undefined,
    model: flightData?.aircraft?.model ?? undefined,
    manufacturer: flightData?.aircraft?.manufacturer ?? undefined,
  };

  const gcs: GutmaGcs = {
    type: flightData?.gcs?.type ?? undefined,
    name: flightData?.gcs?.name ?? undefined,
    serial_number: flightData?.gcs?.serial_number ?? undefined,
  };

  const rawWaypoints: Record<string, unknown>[] =
    flightData?.flight_logging?.flight_logging_items ?? [];

  const waypointsFull: GutmaWaypoint[] = rawWaypoints.slice(0, 200).map((w) => {
    const lat =
      w.lat != null ? Number(w.lat)
      : w.latitude != null ? Number(w.latitude)
      : w.y != null ? Number(w.y)
      : undefined;
    const lng =
      w.lon != null ? Number(w.lon)
      : w.longitude != null ? Number(w.longitude)
      : w.x != null ? Number(w.x)
      : undefined;
    return {
      timestamp: w.timestamp != null ? Number(w.timestamp) : undefined,
      latitude: lat,
      longitude: lng,
      altitude: w.altitude != null ? Number(w.altitude) : undefined,
      speed: w.speed != null ? Number(w.speed) : undefined,
      heading: w.heading != null ? Number(w.heading) : undefined,
    };
  });

  const startTime: string | undefined =
    flightData?.start_time ?? msg?.start_time ?? undefined;
  const endTime: string | undefined =
    flightData?.end_time ?? msg?.end_time ?? undefined;

  return {
    flight_id: flightId,
    aircraft,
    gcs,
    waypoints: waypointsFull,
    total_waypoints: rawWaypoints.length,
    start_time: startTime,
    end_time: endTime,
    raw_filename: filename,
  };
}
