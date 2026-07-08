'use server';

import { env } from '@/backend/config/env';
import { signReadiControlJwt, signReadiControlJwtWithMultipleOrgs } from '@/lib/drone-atc-jwt';

export interface OrganizationCredentials {
  orgId: string;
  token: string;
}

export interface FlytrelayFlight {
  flight_id: string;
  drone_id: string;
  drone_name: string;
  company_id: number;
  company_name: string;
  start_time: string;
  end_time: string;
  max_altitude?: number;
  serial_number?: string;
}

export interface FlytrelayGutmaData {
  gutma: {
    exchange: {
      message: {
        flight_data: {
          aircraft?: {
            model?: string;
            manufacturer?: string;
          };
          payload?: any[];
        };
        flight_logging?: {
          logging_start_dtg?: string;
          flight_logging_keys?: string[];
          flight_logging_items?: any[][];
          events?: any[];
        };
      };
    };
  };
}

export async function fetchFlytrelayFlights(
  userId: string,
  companyId?: string,
  droneId?: string,
  page?: number,
  pageSize?: number,
  organizations?: OrganizationCredentials[],
): Promise<{ flights: FlytrelayFlight[]; total: number }> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  let jwt;
  if (organizations && organizations.length > 0) {
    jwt = signReadiControlJwtWithMultipleOrgs(userId, organizations, companyId);
  } else {
    jwt = signReadiControlJwt(userId, companyId);
  }

  const params = new URLSearchParams();
  if (companyId !== undefined) params.set('companyId', String(companyId));
  if (droneId) params.set('droneId', droneId);
  if (page !== undefined) params.set('page', String(page));
  if (pageSize !== undefined) params.set('limit', String(pageSize));

  const url = `${baseUrl}/api/logs${params.toString() ? `?${params.toString()}` : ''}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    const isTimeout = err?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'FlytRelay flights API timed out after 30s'
        : `FlytRelay flights API network error: ${err?.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  console.log('[FlytRelay flights] status:', response.status, 'body:', responseText);

  if (!response.ok) {
    throw new Error(`FlytRelay flights API failed (${response.status}): ${responseText}`);
  }

  const body = JSON.parse(responseText);
  if (!body.ok) {
    throw new Error(`FlytRelay flights API returned error: ${responseText}`);
  }

  const flights = body.flights ?? [];
  const total = body.total ?? flights.length ?? 0;

  // Limit to requested pageSize in case FlytRelay API returns more than requested
  const limitedFlights = flights.slice(0, pageSize ?? 8);
  return { flights: limitedFlights, total };
}

export async function fetchFlytrelayGutma(
  userId: string,
  flightId: string,
  companyId?: string,
  organizations?: OrganizationCredentials[],
): Promise<FlytrelayGutmaData> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  let jwt;
  if (organizations && organizations.length > 0) {
    jwt = signReadiControlJwtWithMultipleOrgs(userId, organizations, companyId);
  } else {
    jwt = signReadiControlJwt(userId, companyId);
  }

  const url = `${baseUrl}/api/logs/${encodeURIComponent(flightId)}/gutma`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    const isTimeout = err?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'FlytRelay GUTMA API timed out after 60s'
        : `FlytRelay GUTMA API network error: ${err?.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  console.log('[FlytRelay GUTMA] status:', response.status, 'flightId:', flightId);

  if (!response.ok) {
    throw new Error(`FlytRelay GUTMA API failed (${response.status}): ${responseText}`);
  }

  const body = JSON.parse(responseText);
  if (!body.ok) {
    throw new Error(`FlytRelay GUTMA API returned error: ${responseText}`);
  }

  return body;
}
