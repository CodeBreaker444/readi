import { internalError } from '@/lib/api-error';
import { requirePermission } from '@/lib/auth/api-auth';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function GET(req: NextRequest) {
  const { error } = await requirePermission('view_operations');
  if (error) return error;

  const name = req.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const cacheKey = name.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return NextResponse.json({ location: geocodeCache.get(cacheKey) ?? null });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
      q: name,
      countrycodes: 'it',
      format: 'jsonv2',
      limit: '1',
    })}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'readi-platform/1.0' },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) {
      geocodeCache.set(cacheKey, null);
      return NextResponse.json({ location: null });
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    const location = results[0] ? { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) } : null;
    geocodeCache.set(cacheKey, location);
    return NextResponse.json({ location });
  } catch (err) {
    console.error('[GET /api/operation/dflight/geocode-uspace] failed:', err);
    return internalError(E.SV001, err);
  }
}
