import 'server-only';
import https from 'https';
import { env } from '@/backend/config/env';
import { signReadiDroneJwt } from './drone-atc-jwt';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
  token: string;
}

function httpsRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const extraHeaders: Record<string, string | number> = body
      ? { 'Content-Length': Buffer.byteLength(body) }
      : {};
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method,
        headers: { ...headers, ...extraHeaders },
        rejectUnauthorized: false, // Flytrelay uses a self-signed certificate
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const httpsPost = (url: string, headers: Record<string, string>) =>
  httpsRequest(url, 'POST', headers);

export async function connectToFlytrelay(userId: string, flytbaseKey: string): Promise<FlytrelayConnection> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey);

  const { status, body } = await httpsPost(`${baseUrl}/api/auth/identify`, {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
  });

  console.log('[FlytRelay identify] status:', status, 'body:', body);

  if (status < 200 || status >= 300) {
    throw new Error(`FlytRelay identify failed (${status}): ${body}`);
  }

  const data = JSON.parse(body);

  if (!data.wsUrl || !data.topic) {
    throw new Error('FlytRelay returned invalid connection data');
  }

  // Use the session token Flytrelay returns; fall back to the JWT we sent if absent
  const socketToken: string = data.token ?? data.sessionToken ?? jwt;

  return { wsUrl: data.wsUrl, topic: data.topic, token: socketToken };
}

export async function updateFlytrelayUsers(
  userId: string,
  flytbaseKey: string,
  users: unknown[],
): Promise<{ synced: number }> {
  const baseUrl = env.FLYTRELAY_BASE_URL;
  if (!baseUrl) throw new Error('FLYTRELAY_BASE_URL is not configured');

  const jwt = signReadiDroneJwt(userId, flytbaseKey);
  const body = JSON.stringify({ users });

  const { status, body: responseBody } = await httpsRequest(
    `${baseUrl}/api/users`,
    'PATCH',
    { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body,
  );

  console.log('[FlytRelay updateUsers] status:', status, 'body:', responseBody);

  if (status < 200 || status >= 300) {
    throw new Error(`FlytRelay user update failed (${status}): ${responseBody}`);
  }

  return { synced: users.length };
}
