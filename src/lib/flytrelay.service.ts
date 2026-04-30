import 'server-only';
import { env } from '@/backend/config/env';
import { signReadiDroneJwt } from './drone-atc-jwt';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
}

export async function connectToFlytrelay(userId: string): Promise<FlytrelayConnection> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const token = signReadiDroneJwt(userId);

  const res = await fetch(`${baseUrl}/api/auth/identify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`FlytRelay identify failed (${res.status}): ${body}`);
  }

  const data = await res.json();

  if (!data.wsUrl || !data.topic) {
    throw new Error('FlytRelay returned invalid connection data');
  }

  return { wsUrl: data.wsUrl, topic: data.topic };
}
