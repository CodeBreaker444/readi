import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import process, { env } from 'process';

export interface AuthRequest extends Request {
  userId?: number;
  ownerId?: number;
}

/**
 * Verify JWT token from Authorization header
 */
export function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        code: 0,
        status: 'ERROR',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Removed 'Bearer ' prefix

    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      userId: number;
      ownerId: number;
    };

    req.userId = decoded.userId;
    req.ownerId = decoded.ownerId;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        code: 0,
        status: 'ERROR',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        code: 0,
        status: 'ERROR',
        message: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      code: 0,
      status: 'ERROR',
      message: 'Token verification failed',
    });
  }
}

/**
 * Verify API Key from X-API-KEY header
 */
export function verifyApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        code: 0,
        status: 'ERROR',
        message: 'API key required',
      });
      return;
    }

    const validApiKey = process.env.API_KEY;
    if (!validApiKey) {
      throw new Error('API_KEY not configured');
    }

    if (apiKey !== validApiKey) {
      res.status(401).json({
        code: 0,
        status: 'ERROR',
        message: 'Invalid API key',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      code: 0,
      status: 'ERROR',
      message: 'API key verification failed',
    });
  }
}

 
export const authenticate = [verifyToken, verifyApiKey];