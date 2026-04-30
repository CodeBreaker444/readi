import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m,apparent_temperature');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('timezone', 'auto');

  const res = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!res.ok) {
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
