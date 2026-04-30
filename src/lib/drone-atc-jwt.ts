import 'server-only';
import jwt from 'jsonwebtoken';
import { env } from '@/backend/config/env';

export interface ReadiDronePayload {
  sub: string;
  userId: string;
  iss: string;
  iat?: number;
  exp?: number;
}

export function signReadiDroneJwt(userId: string): string {
  if (!env.READI_DRONE_PRIVATE_KEY) {
    throw new Error('READI_DRONE_PRIVATE_KEY is not configured');
  }
  return jwt.sign(
    { userId },
    env.READI_DRONE_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: '5m',
      issuer: 'readi-app',
      subject: userId,
    }
  );
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
