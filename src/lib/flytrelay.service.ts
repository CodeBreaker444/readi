import 'server-only';
import https from 'https';
import { env } from '@/backend/config/env';
import { signReadiDroneJwt } from './drone-atc-jwt';

export interface FlytrelayConnection {
  wsUrl: string;
  topic: string;
  token: string;
}

function httpsPost(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers,
        rejectUnauthorized: false, // Flytrelay uses a self-signed certificate
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

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
