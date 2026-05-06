import { requireAuth } from '@/lib/auth/api-auth';
import { NextRequest, NextResponse } from 'next/server';

 
interface AirspaceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  class: 'A' | 'B' | 'C' | 'D';
  type: 'CTR' | 'TMA' | 'AIRPORT' | 'RESTRICTED';
  lowerFt: number;
  upperFt: number;
}

 
const ITALIAN_AIRSPACE: AirspaceZone[] = [
  {
    id: 'LIRA_TMA',
    name: 'Roma Fiumicino TMA (Class B)',
    lat: 41.8002,
    lon: 12.2388,
    radiusM: 46300, // 25 NM
    class: 'B',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
  {
    id: 'LIMJ_TMA',
    name: 'Milano Malpensa TMA (Class B)',
    lat: 45.6306,
    lon: 8.7236,
    radiusM: 46300,
    class: 'B',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
  {
    id: 'LIME_TMA',
    name: 'Torino Caselle TMA (Class B)',
    lat: 45.2008,
    lon: 7.6496,
    radiusM: 46300,
    class: 'B',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
  {
    id: 'LIRF_CTR',
    name: 'Roma Fiumicino CTR (Class D)',
    lat: 41.8002,
    lon: 12.2388,
    radiusM: 18520, // 10 NM
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 1000,
  },
  {
    id: 'LICC_CTR',
    name: 'Catania Fontanarossa CTR (Class D)',
    lat: 37.4672,
    lon: 15.0701,
    radiusM: 13890, // 7.5 NM
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 750,
  },
  {
    id: 'LIEA_CTR',
    name: 'Napoli Capodichino CTR (Class D)',
    lat: 40.8858,
    lon: 14.2908,
    radiusM: 13890,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 750,
  },
  {
    id: 'LIBD_CTR',
    name: 'Bologna Marconi CTR (Class D)',
    lat: 44.5349,
    lon: 11.2888,
    radiusM: 13890,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 800,
  },
  {
    id: 'LIPZ_CTR',
    name: 'Venezia Tessera CTR (Class D)',
    lat: 45.5058,
    lon: 12.3201,
    radiusM: 13890,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 800,
  },
  {
    id: 'LIPE_CTR',
    name: 'Perugia Sant Egidio CTR (Class D)',
    lat: 43.1099,
    lon: 12.5142,
    radiusM: 9260, // 5 NM
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIMF_CTR',
    name: 'Firenze Peretola CTR (Class D)',
    lat: 43.8099,
    lon: 11.2018,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIMG_CTR',
    name: 'Genova Cristoforo Colombo CTR (Class D)',
    lat: 44.4134,
    lon: 8.8436,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIME_CTR',
    name: 'Torino Caselle CTR (Class D)',
    lat: 45.2008,
    lon: 7.6496,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIPR_CTR',
    name: 'Parma CTR (Class D)',
    lat: 44.8261,
    lon: 10.3966,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIPK_CTR',
    name: 'Palermo Punta Raisi CTR (Class D)',
    lat: 37.6214,
    lon: 13.091,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIRN_CTR',
    name: 'Bari Karol Wojtyla CTR (Class D)',
    lat: 41.1367,
    lon: 16.761,
    radiusM: 9260,
    class: 'D',
    type: 'CTR',
    lowerFt: 0,
    upperFt: 600,
  },
  {
    id: 'LIRF_APPR',
    name: 'Roma Approach Sector (Class C)',
    lat: 41.8002,
    lon: 12.2388,
    radiusM: 92600, // 50 NM
    class: 'C',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
  {
    id: 'LIMJ_APPR',
    name: 'Milano Approach Sector (Class C)',
    lat: 45.6306,
    lon: 8.7236,
    radiusM: 92600,
    class: 'C',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
  {
    id: 'LIME_APPR',
    name: 'Torino Approach Sector (Class C)',
    lat: 45.2008,
    lon: 7.6496,
    radiusM: 92600,
    class: 'C',
    type: 'TMA',
    lowerFt: 1000,
    upperFt: 24500,
  },
];

const ITALY_BOUNDS = { latMin: 36.0, lonMin: 6.5, latMax: 47.5, lonMax: 18.5 } as const;

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const south = parseFloat(searchParams.get('south') || '36.0');
  const west = parseFloat(searchParams.get('west') || '6.5');
  const north = parseFloat(searchParams.get('north') || '47.5');
  const east = parseFloat(searchParams.get('east') || '18.5');

  try {
    // Filter airspace zones by bounding box with buffer
    const filtered = ITALIAN_AIRSPACE.filter(zone => {
      const latMin = zone.lat - zone.radiusM / 111320; 
      const latMax = zone.lat + zone.radiusM / 111320;
      const lonMin = zone.lon - (zone.radiusM / 111320) / Math.cos((zone.lat * Math.PI) / 180);
      const lonMax = zone.lon + (zone.radiusM / 111320) / Math.cos((zone.lat * Math.PI) / 180);

      return latMin < north && latMax > south && lonMin < east && lonMax > west;
    });

    // Add cache headers for airspace data changes infrequently
    return NextResponse.json(
      { airspace: filtered, timestamp: new Date().toISOString() },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      }
    );
  } catch (err) {
    console.error('[drone-atc/airspace] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch airspace data', airspace: [] },
      { status: 500 }
    );
  }
}
