import { serverEnv } from '@/config/environ';
import jwt from 'jsonwebtoken';
import { Role } from './roles';

export interface JWTPayload {
  sub: string;
  email: string;
  username: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  if (!serverEnv.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    payload,
    serverEnv.JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'readi-app',
    }
  );
}

export function verifyToken(token: string): JWTPayload | null {
  if (!serverEnv.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');
    return null;
  }

  try {
    const decoded = jwt.verify(token, serverEnv.JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Token decode failed:', error);
    return null;
  }
}