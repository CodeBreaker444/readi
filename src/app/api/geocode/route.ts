import { env } from '@/backend/config/env';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 3) {
    return NextResponse.json([]);
  }

  const apiKey = env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error('[geocode] OPENWEATHER_API_KEY is not set');
    return NextResponse.json([]);
  }

  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q.trim())}&limit=5&appid=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('[geocode] OpenWeather error:', res.status);
      return NextResponse.json([]);
    }

    const data = await res.json();
    console.log('[geocode] query:', q.trim(), '— results:', data?.length ?? 0);

    const results = (data ?? []).map((item: any, i: number) => {
      const parts = [item.name, item.state, item.country].filter(Boolean);
      return {
        place_id:     i,
        display_name: parts.join(', '),
        lat:          String(item.lat),
        lon:          String(item.lon),
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    clearTimeout(timeout);
    console.error('[geocode] fetch error:', err);
    return NextResponse.json([]);
  }
}
