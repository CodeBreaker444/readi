import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (works for single-instance deployments)
const rateLimitStore = new Map<string, RateLimitStore>();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export interface RateLimitOptions {
  limit: number;      // Maximum requests allowed
  window: number;     // Time window in milliseconds
  identifier?: string; // Custom identifier (defaults to IP)
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}


export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const { limit, window } = options;
  const resetTime = now + window;

  const existing = rateLimitStore.get(identifier);

  if (!existing || now > existing.resetTime) {
    // Create new entry or reset expired entry
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    };
  }

  if (existing.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetTime,
    };
  }

  // Increment count
  existing.count++;
  rateLimitStore.set(identifier, existing);

  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: existing.resetTime,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  // Fallback to a default if no IP found
  return 'unknown';
}

/**
 * Middleware-style rate limiter for API routes
 * Returns error response if rate limit exceeded, null otherwise
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const identifier = options.identifier || ip;
  
  const result = rateLimit(identifier, options);
  
  if (!result.success) {
    const resetDate = new Date(result.reset);
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    
    return NextResponse.json(
      {
        code: 0,
        status: 'ERROR',
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }
  
  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());
  
  return null;
}

// Predefined rate limit configurations
export const RATE_LIMITS = {
  // Strict limits for auth endpoints
  LOGIN: { limit: 30, window: 15 * 60 * 1000 },      // 30 requests per 15 minutes
  ACTIVATE: { limit: 50, window: 60 * 60 * 1000 },   // 50 requests per hour
  PASSWORD_UPDATE: { limit: 20, window: 60 * 60 * 1000 }, // 20 requests per hour
  
  // Standard limits for general API
  STANDARD: { limit: 300, window: 60 * 1000 },        // 300 requests per minute
  
  // Lenient limits for read operations
  READ: { limit: 500, window: 60 * 1000 },          // 500 requests per minute
} as const;

