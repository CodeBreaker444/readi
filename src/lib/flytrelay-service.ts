import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import 'server-only';
import { signReadiDroneJwt } from './drone-atc-jwt';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
  token: string;
}

const CONNECT_TTL_MS = 30_000;
const CONNECT_TIMEOUT_MS = 5_000;
const _connCache = new Map<string, { value: FlytrelayConnection; expiresAt: number }>();

export async function connectToFlytrelay(
  userId: string,
  flytbaseKey: string,
  orgId: string,
  companyId?: string,
): Promise<FlytrelayConnection> {
  const cacheKey = `${userId}:${orgId}:${companyId ?? ''}`;
  const cached = _connCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey, orgId, companyId);

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
    throw new Error(isTimeout ? 'FlytRelay identify timed out after 5s' : `FlytRelay identify network error: ${err?.message}`);
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
  const conn: FlytrelayConnection = { wsUrl: data.wsUrl, topic: data.topic, token: socketToken };

  _connCache.set(cacheKey, { value: conn, expiresAt: Date.now() + CONNECT_TTL_MS });

  return conn;
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
    method: 'PATCH',
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

