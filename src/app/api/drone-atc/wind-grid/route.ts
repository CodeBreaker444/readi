import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

 
const GRID_ROWS = 10;
const GRID_COLS = 10;
 
const LAT_LIMIT = 85;
const LON_LIMIT = 180;

interface OpenMeteoPoint {
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get('south') || String(-LAT_LIMIT));
  const west  = parseFloat(searchParams.get('west')  || String(-LON_LIMIT));
  const north = parseFloat(searchParams.get('north') || String(LAT_LIMIT));
  const east  = parseFloat(searchParams.get('east')  || String(LON_LIMIT));

  const s = Math.max(Math.min(south, north), -LAT_LIMIT);
  const n = Math.min(Math.max(south, north), LAT_LIMIT);
  const w = Math.max(Math.min(west, east), -LON_LIMIT);
  const e = Math.min(Math.max(west, east), LON_LIMIT);

  if (s >= n || w >= e) {
    return NextResponse.json({ error: 'Invalid bounds' }, { status: 400 });
  }

  const dLat = (n - s) / (GRID_ROWS - 1);
  const dLon = (e - w) / (GRID_COLS - 1);

  // Row-major, north → south then west → east, matching the header below.
  const lats: number[] = [];
  const lons: number[] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const lat = n - r * dLat;
    for (let c = 0; c < GRID_COLS; c++) {
      lats.push(lat);
      lons.push(w + c * dLon);
    }
  }

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lats.map(v => v.toFixed(4)).join(','));
  url.searchParams.set('longitude', lons.map(v => v.toFixed(4)).join(','));
  url.searchParams.set('current', 'wind_speed_10m,wind_direction_10m');
  url.searchParams.set('wind_speed_unit', 'ms');

  let res: Response;
  try {
    res = await fetch(url.toString(), { next: { revalidate: 300 } });
  } catch (err) {
    console.error('[drone-atc/wind-grid] fetch error:', err);
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: 'Weather service unavailable' }, { status: 502 });
  }

  const points: OpenMeteoPoint[] = await res.json();
  if (!Array.isArray(points) || points.length !== GRID_ROWS * GRID_COLS) {
    return NextResponse.json({ error: 'Unexpected weather response' }, { status: 502 });
  }

  const uData = new Array<number>(GRID_ROWS * GRID_COLS).fill(0);
  const vData = new Array<number>(GRID_ROWS * GRID_COLS).fill(0);

  points.forEach((point, i) => {
    const speed = point?.current?.wind_speed_10m ?? 0;
    const dir = point?.current?.wind_direction_10m ?? 0;
    // wind_direction_10m is the meteorological "blowing FROM" bearing — flip
    // 180° to get the bearing the air is actually travelling toward.
    const toBearing = ((dir + 180) % 360) * (Math.PI / 180);
    uData[i] = Math.sin(toBearing) * speed;
    vData[i] = Math.cos(toBearing) * speed;
  });

  const apiTime = points[0]?.current?.time;
  const apiDate = apiTime ? new Date(`${apiTime}Z`) : null;
  const refTime = (apiDate && !isNaN(apiDate.getTime()) ? apiDate : new Date()).toISOString();
  const baseHeader = {
    parameterUnit: 'm.s-1',
    la1: n, lo1: w, la2: s, lo2: e,
    dx: dLon, dy: dLat,
    nx: GRID_COLS, ny: GRID_ROWS,
    refTime, forecastTime: 0,
  };

  return NextResponse.json(
    [
      { header: { ...baseHeader, parameterCategory: 2, parameterNumber: 2, parameterNumberName: 'Eastward wind' }, data: uData },
      { header: { ...baseHeader, parameterCategory: 2, parameterNumber: 3, parameterNumberName: 'Northward wind' }, data: vData },
    ],
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
