import { env } from '@/backend/config/env';
import { unstable_cache } from 'next/cache';
import 'server-only';
import { signReadiDroneJwt, signReadiDroneJwtWithMultipleOrgs, OrganizationCredentials } from './drone-atc-jwt';
import axios from 'axios';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
  token: string;
}

const CONNECT_TIMEOUT_MS = 5_000;

async function fetchFlytrelayConnection(
  userId: string,
  flytbaseKey: string,
  orgId: string,
  companyId: string | null,
): Promise<FlytrelayConnection> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey, orgId, companyId ?? undefined);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/auth/identify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'FlytRelay identify timed out after 5s'
        : `FlytRelay identify network error: ${err?.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.text();
  console.log('[FlytRelay identify] status:', res.status, 'body:', body);

  if (!res.ok) {
    throw new Error(`FlytRelay identify failed (${res.status}): ${body}`);
  }

  const data = JSON.parse(body);

  if (!data.wsUrl || !data.topic) {
    throw new Error('FlytRelay returned invalid connection data');
  }

  const socketToken: string = data.token ?? data.sessionToken ?? jwt;
  return { wsUrl: data.wsUrl, topic: data.topic, token: socketToken };
}

export async function connectToFlytrelay(
  userId: string,
  flytbaseKey: string,
  orgId: string,
  companyId?: string,
): Promise<FlytrelayConnection> {
  const cached = unstable_cache(
    () => fetchFlytrelayConnection(userId, flytbaseKey, orgId, companyId ?? null),
    [`flytrelay-connect-${userId}-${orgId}`],
    { revalidate: 30, tags: [`flytrelay-connect-${userId}`] },
  );
  return cached();
}

export async function updateFlytrelayUsers(
  userId: string,
  flytbaseKey: string,
  orgId: string,
  users: unknown[],
): Promise<{ synced: number }> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey, orgId);

  const res = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  });

  const responseBody = await res.text();
  console.log('[FlytRelay updateUsers] status:', res.status, 'body:', responseBody);

  if (!res.ok) {
    throw new Error(`FlytRelay user update failed (${res.status}): ${responseBody}`);
  }

  return { synced: users.length };
}

async function fetchFlytrelayConnectionWithMultipleOrgs(
  userId: string,
  organizations: OrganizationCredentials[],
  companyId: string | null,
): Promise<FlytrelayConnection> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwtWithMultipleOrgs(userId, organizations, companyId ?? undefined);
console.log('jwt payload:',jwt);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/auth/identify`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    throw new Error(
      isTimeout
        ? 'FlytRelay identify timed out after 5s'
        : `FlytRelay identify network error: ${err?.message}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const body = await res.text();
  console.log('[FlytRelay identify with multiple orgs] status:', res.status, 'body:', body);

  if (!res.ok) {
    throw new Error(`FlytRelay identify failed (${res.status}): ${body}`);
  }

  const data = JSON.parse(body);

  if (!data.wsUrl || !data.topic) {
    throw new Error('FlytRelay returned invalid connection data');
  }

  const socketToken: string = data.token ?? data.sessionToken ?? jwt;
  return { wsUrl: data.wsUrl, topic: data.topic, token: socketToken };
}

export async function connectToFlytrelayWithMultipleOrgs(
  userId: string,
  organizations: OrganizationCredentials[],
  companyId?: string,
): Promise<FlytrelayConnection> {
  const cached = unstable_cache(
    () => fetchFlytrelayConnectionWithMultipleOrgs(userId, organizations, companyId ?? null),
    [`flytrelay-connect-multi-${userId}-${organizations.length}`],
    { revalidate: 30, tags: [`flytrelay-connect-${userId}`] },
  );
  return cached();
}

export async function updateFlytrelayUsersWithMultipleOrgs(
  userId: string,
  organizations: OrganizationCredentials[],
  users: unknown[],
  companyId?: string,
): Promise<{ synced: number }> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');


  const jwt = signReadiDroneJwtWithMultipleOrgs(userId, organizations, companyId);
  console.log('[FlytRelay updateUsers] organizations count:', organizations.length, 'companyId:', companyId);

  const requestBody = { users };
console.log('users:',users)
  try {
    const url = `${baseUrl}/api/users`;

    const res = await axios.post(url, requestBody, {
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    });
    
    const responseBody = await res.data;
console.log('[FlytRelay updateUsers] status:', res.status);
    if (!res.status || res.status < 200 || res.status >= 300) {
      throw new Error(`FlytRelay user update failed (${res.status}): ${responseBody}`);
    }

    return { synced: users.length };
  } catch (err: any) {
    console.error('[FlytRelay updateUsers] Network or fetch error:', err);
    throw err;
  }
}
