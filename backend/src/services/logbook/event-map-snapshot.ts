import 'server-only';

import { LEAFLET_TILE_LIGHT, LEAFLET_TILE_LIGHT_LABELS } from '@/lib/leaflet-tiles';

const TILE = 256;
const ZOOM = 15;
const WIDTH = 600;
const HEIGHT = 300;

function worldPixel(lat: number, lng: number, zoom: number) {
  const scale = TILE * 2 ** zoom;
  const sin = Math.min(Math.max(Math.sin((lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

async function fetchTile(template: string, z: number, x: number, y: number): Promise<Buffer | null> {
  try {
    const res = await fetch(template.replace('{z}', String(z)).replace('{y}', String(y)).replace('{x}', String(x)), {
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

const PIN_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="54" viewBox="0 0 24 36">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 24 12 24s12-15.75 12-24C24 5.373 18.627 0 12 0z" fill="#7c3aed" stroke="#ffffff" stroke-width="1"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
);

/**
 * Renders a small PNG map (basemap + labels + pin) centred on the coordinates, for use in emails
 * where an interactive map is not possible. Returns null when the tiles or the image library are
 * unavailable, so callers can fall back to a plain map link.
 */
export async function renderMapSnapshot(lat: number, lng: number): Promise<Buffer | null> {
  try {
    // sharp ships with Next.js; import lazily so a missing binary only disables the snapshot.
    const sharp = (await import('sharp')).default;

    const centre = worldPixel(lat, lng, ZOOM);
    const originX = centre.x - WIDTH / 2;
    const originY = centre.y - HEIGHT / 2;
    const firstX = Math.floor(originX / TILE);
    const lastX = Math.floor((originX + WIDTH) / TILE);
    const firstY = Math.floor(originY / TILE);
    const lastY = Math.floor((originY + HEIGHT) / TILE);
    const max = 2 ** ZOOM;

    const layers: { input: Buffer; left: number; top: number; kind: number }[] = [];
    const jobs: Promise<void>[] = [];
    for (let ty = firstY; ty <= lastY; ty++) {
      for (let tx = firstX; tx <= lastX; tx++) {
        if (ty < 0 || ty >= max) continue;
        const wrappedX = ((tx % max) + max) % max;
        [LEAFLET_TILE_LIGHT, LEAFLET_TILE_LIGHT_LABELS].forEach((template, kind) => {
          jobs.push(
            fetchTile(template, ZOOM, wrappedX, ty).then((input) => {
              if (input) layers.push({ input, kind, left: Math.round(tx * TILE - originX), top: Math.round(ty * TILE - originY) });
            }),
          );
        });
      }
    }
    await Promise.all(jobs);
    if (layers.length === 0) return null;

    // Composite order follows array order: base tiles first, then the transparent label tiles on top.
    layers.sort((a, b) => a.kind - b.kind);
    const base = sharp({ create: { width: WIDTH, height: HEIGHT, channels: 3, background: '#e5e7eb' } });
    // Tiles can overhang the canvas; extract only the visible part of each.
    const composites = await Promise.all(
      layers.map(async (l) => {
        const left = Math.max(l.left, 0);
        const top = Math.max(l.top, 0);
        const cropLeft = left - l.left;
        const cropTop = top - l.top;
        const width = Math.min(TILE - cropLeft, WIDTH - left);
        const height = Math.min(TILE - cropTop, HEIGHT - top);
        if (width <= 0 || height <= 0) return null;
        const input = await sharp(l.input).extract({ left: cropLeft, top: cropTop, width, height }).toBuffer();
        return { input, left, top };
      }),
    );

    return await base
      .composite([
        ...composites.filter((c): c is { input: Buffer; left: number; top: number } => c !== null),
        { input: PIN_SVG, left: Math.round(WIDTH / 2 - 18), top: Math.round(HEIGHT / 2 - 54) },
      ])
      .png()
      .toBuffer();
  } catch (err) {
    console.error('[event-map] snapshot failed', err);
    return null;
  }
}
