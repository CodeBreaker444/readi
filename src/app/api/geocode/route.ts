import { env } from '@/backend/config/env';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function searchOpenWeather(q: string, apiKey: string) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=5&appid=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return (data as any[]).map((item, i) => ({
      place_id:     i,
      display_name: [item.name, item.state, item.country].filter(Boolean).join(', '),
      lat:          String(item.lat),
      lon:          String(item.lon),
    }));
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

async function searchNominatim(q: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Accept-Language': 'en', 'User-Agent': 'Readi-App/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    return (await res.json()) ?? [];
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 3) return NextResponse.json([]);

  const query = q.trim();
  const apiKey = env.OPENWEATHER_API_KEY;

  if (apiKey) {
    const owResults = await searchOpenWeather(query, apiKey);
    if (owResults) {
      console.log('[geocode] OpenWeather —', query, ':', owResults.length, 'results');
      return NextResponse.json(owResults);
    }
  }

  console.log('[geocode] Nominatim fallback —', query);
  const results = await searchNominatim(query);
  return NextResponse.json(results);
}
