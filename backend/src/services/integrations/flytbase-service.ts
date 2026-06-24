'use server';

import { env } from '@/backend/config/env';
import { prisma } from '@/lib/prisma';


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
  tokenName?: string,
): Promise<void> {
  await prisma.public_users.update({
    where: { user_id: userId },
    data: {
      flytbase_api_token: plainToken.trim(),
      flytbase_org_id: orgId.trim(),
      flytbase_token_name: tokenName?.trim() || null,
    },
  });
}

export async function hasFlytbaseToken(userId: number): Promise<{ exists: boolean; tokenName: string | null }> {
  const user = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { flytbase_api_token: true, flytbase_org_id: true, flytbase_token_name: true },
  });

  if (!user) throw new Error('hasFlytbaseToken: user not found');
  return {
    exists: !!(user.flytbase_api_token && user.flytbase_org_id),
    tokenName: user.flytbase_token_name ?? null,
  };
}

export async function getFlytbaseCredentials(
  userId: number,
): Promise<{ token: string; orgId: string } | null> {
  const user = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { flytbase_api_token: true, flytbase_org_id: true },
  });

  if (!user?.flytbase_api_token || !user?.flytbase_org_id) return null;
  return { token: user.flytbase_api_token, orgId: user.flytbase_org_id };
}

export async function getFlytbaseCredentialsForCompany(
  ownerId: number,
  excludeUserId?: number,
): Promise<{ token: string; orgId: string; userId: number } | null> {
  const user = await prisma.public_users.findFirst({
    where: {
      fk_owner_id: ownerId,
      flytbase_api_token: { not: null },
      flytbase_org_id: { not: null },
      ...(excludeUserId !== undefined && { user_id: { not: excludeUserId } }),
    },
    select: { user_id: true, flytbase_api_token: true, flytbase_org_id: true },
  });

  if (!user?.flytbase_api_token || !user?.flytbase_org_id) return null;
  return { token: user.flytbase_api_token, orgId: user.flytbase_org_id, userId: user.user_id };
}

/** Remove the stored FlytBase credentials for the given user. */
export async function removeFlytbaseToken(userId: number): Promise<void> {
  await prisma.public_users.update({
    where: { user_id: userId },
    data: { flytbase_api_token: null, flytbase_org_id: null, flytbase_token_name: null },
  });
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
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${env.FLYTBASE_URL}/v2/flight?${params.toString()}`, {
      method: 'GET',
      headers: flytbaseHeaders(token, org),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(t);
    if (e.name === 'AbortError') throw new Error('FlytBase API timed out. Please try again.');
    throw e;
  }
  clearTimeout(t);

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
function mapFlightLog(f: Record<string, unknown>): FlytbaseFlight {
  const drone   = f.drone_details   as Record<string, unknown> | null | undefined;
  const mission = (f.missions as Record<string, unknown>[] | null | undefined)?.[0];

  const startIso = (mission?.mission_start_time ?? f.timestamp) as string | null | undefined;
  const endIso   = mission?.mission_end_time as string | null | undefined;

  const startMs = startIso ? new Date(startIso).getTime() : undefined;
  const endMs   = endIso   ? new Date(endIso).getTime()   : undefined;
  const duration = startMs != null && endMs != null
    ? Math.round((endMs - startMs) / 1000)
    : undefined;

  return {
    flight_id:    String(f.flight_id ?? ''),
    flight_name:  mission?.mission_name != null ? String(mission.mission_name) : undefined,
    start_time:   startMs,
    end_time:     endMs,
    duration,
    distance:     mission?.mission_length != null ? Number(mission.mission_length) : undefined,
    drone_name:   drone?.drone_name != null ? String(drone.drone_name) : undefined,
    drone_id:     drone?.drone_id   != null ? String(drone.drone_id)   : undefined,
    pilot_name:   undefined, // not available in flight listing; only in GUTMA download
    mission_name: mission?.mission_name != null ? String(mission.mission_name) : undefined,
    status:       undefined,
  };
}

export async function fetchLatestFlights(
  token: string,
  orgId: string,
  page = 1,
  pageSize = 20,
): Promise<{ flights: FlytbaseFlight[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: String(pageSize), archived: 'false' });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${env.FLYTBASE_URL}/v2/flight?${params.toString()}`, {
      method: 'GET',
      headers: flytbaseHeaders(token, orgId),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(t);
    if (e.name === 'AbortError') throw new Error('FlytBase API timed out.');
    throw e;
  }
  clearTimeout(t);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`FlytBase flights API error ${response.status}: ${text}`);
  }

  const body = await response.json();
  const rawFlights: Record<string, unknown>[] = body?.flightLogs ?? [];
  const total: number = (body?.total as { value?: number })?.value ?? rawFlights.length;

  const flights = rawFlights.map(mapFlightLog);
  return { flights, total };
}

export async function fetchRecentFlights(
  token: string,
  orgId: string,
  windowMinutes = 30,
  page = 1,
  pageSize = 20,
): Promise<{ flights: FlytbaseFlight[]; total: number }> {
  const now = Date.now();
  const startDate = now - windowMinutes * 60 * 1000;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSize),
    archived: 'false',
    startDate: String(startDate),
    endDate: String(now),
  });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(`${env.FLYTBASE_URL}/v2/flight?${params.toString()}`, {
      method: 'GET',
      headers: flytbaseHeaders(token, orgId),
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(t);
    if (e.name === 'AbortError') throw new Error('FlytBase API timed out.');
    throw e;
  }
  clearTimeout(t);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`FlytBase flights API error ${response.status}: ${text}`);
  }

  const body = await response.json();
  const rawFlights: Record<string, unknown>[] = body?.flightLogs ?? [];
  const total: number = (body?.total as { value?: number })?.value ?? rawFlights.length;

  const flights = rawFlights.map(mapFlightLog);
  return { flights, total };
}
