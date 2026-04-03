'use server';

import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';


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

export async function saveFlytbaseConfig(
  userId: number,
  plainToken: string,
  orgId: string,
): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      flytbase_api_token: plainToken.trim(),
      flytbase_org_id: orgId.trim(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`saveFlytbaseConfig: ${error.message}`);
}

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
/** Returns the stored credentials for internal API calls. */
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
    token: data.flytbase_api_token,
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

