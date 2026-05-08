import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import 'server-only';
import { signReadiDroneJwt } from './drone-atc-jwt';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
  token: string;
}

export async function connectToFlytrelay(userId: string, flytbaseKey: string, orgId: string): Promise<FlytrelayConnection> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey, orgId);

  const res = await fetch(`${baseUrl}/api/auth/identify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
  });

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

export async function getEasaCode(userId: number): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('easa_operator_code')
    .eq('user_id', userId)
    .single();
  return (data as any)?.easa_operator_code ?? null;
}