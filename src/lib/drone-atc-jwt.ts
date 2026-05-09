import 'server-only';
import jwt from 'jsonwebtoken';
import { env } from '@/backend/config/env';

export interface ReadiDronePayload {
  sub: string;
  userId: string;
  companyId?: string;
  iss: string;
  iat?: number;
  exp?: number;
}

export function signReadiDroneJwt(
  userId: string,
  flytbaseKey: string,
  orgId: string,
  companyId?: string,
): string {
  if (!env.READI_DRONE_PRIVATE_KEY) {
    throw new Error('READI_DRONE_PRIVATE_KEY is not configured');
  }
  const payload: Record<string, string> = { userId, flytbaseKey, orgId };
  if (companyId) payload.companyId = companyId;
  return jwt.sign(payload, env.READI_DRONE_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: 'readi-app',
  });
}

export function verifyFlytrelayJwt(token: string): { userId: string } | null {
  if (!env.FLYTRELAY_PUBLIC_KEY) {
    console.error('FLYTRELAY_PUBLIC_KEY is not configured');
    return null;
  }
  try {
    const decoded = jwt.verify(token, env.FLYTRELAY_PUBLIC_KEY, {
      algorithms: ['RS256'],
    }) as ReadiDronePayload;
    return { userId: decoded.userId ?? decoded.sub };
  } catch (err) {
    console.error('FlytRelay JWT verification failed:', err);
    return null;
  }
}
