'use client';

import { useEffect, useRef } from 'react';

export interface MapBounds {
  latMin: number; lonMin: number; latMax: number; lonMax: number;
}

interface WindCellSample {
  latC: number; lonC: number; windDir: number; windSpeed: number;
}

// A continuous vector field built from sparse real samples (one Open-Meteo
// reading per grid cell). u/v are the eastward/northward "blowing toward"
// components (m/s-ish), stored per cell center so any in-between point can
// be smoothly interpolated instead of snapping to one uniform cell value.
interface WindField {
  rows: number; cols: number;
  latMin: number; lonMin: number; dLat: number; dLon: number;
  u: Float32Array;
  v: Float32Array;
}

interface WParticle {
  lat: number; lon: number;
  trail: Float32Array; // flat [lat0, lon0, lat1, lon1, ...], oldest last
  trailLen: number;
  speedBoost: number;
  primed: boolean; // has taken at least one real step since (re)spawn
}

const TRAIL_LEN = 7;
const STEP_FRACTION = 0.007;  // fraction of a grid cell crossed per frame at reference speed
const REF_SPEED_MS = 6;       // m/s that maps to "normal" pace
const AREA_PER_PARTICLE = 4200; // px^2 per particle → density scales with viewport size
const MIN_PARTICLES = 90;
const MAX_PARTICLES = 420;
const CALM_SPEED = 0.4;       // m/s below which a particle is considered becalmed

function gridDims(b: MapBounds): { rows: number; cols: number } {
  const span = Math.max(b.latMax - b.latMin, b.lonMax - b.lonMin);
  if (span > 8) return { rows: 2, cols: 2 };
  if (span > 4) return { rows: 3, cols: 3 };
  if (span > 2) return { rows: 4, cols: 4 };
  if (span > 1) return { rows: 5, cols: 5 };
  return { rows: 6, cols: 6 };
}

const toMerc = (lat: number) =>
  Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function geo2px(lat: number, lon: number, b: MapBounds, W: number, H: number): [number, number] {
  const x  = ((lon - b.lonMin) / (b.lonMax - b.lonMin)) * W;
  const mN = toMerc(b.latMax), mS = toMerc(b.latMin);
  const y  = ((mN - toMerc(lat)) / (mN - mS)) * H;
  return [x, y];
}

function buildField(samples: WindCellSample[], rows: number, cols: number): WindField | null {
  if (samples.length !== rows * cols) return null;
  const lats = samples.map(s => s.latC);
  const lons = samples.map(s => s.lonC);
  const latMin = Math.min(...lats), latMax = Math.max(...lats);
  const lonMin = Math.min(...lons), lonMax = Math.max(...lons);
  const dLat = rows > 1 ? (latMax - latMin) / (rows - 1) : 1;
  const dLon = cols > 1 ? (lonMax - lonMin) / (cols - 1) : 1;

  const u = new Float32Array(rows * cols);
  const v = new Float32Array(rows * cols);
  samples.forEach((s, i) => {
    // windDir is meteorological "blowing FROM" bearing — flip 180° to get
    // the direction the air is actually travelling toward.
    const toBearing = ((s.windDir + 180) % 360) * (Math.PI / 180);
    u[i] = Math.sin(toBearing) * s.windSpeed;
    v[i] = Math.cos(toBearing) * s.windSpeed;
  });

  return { rows, cols, latMin, lonMin, dLat: dLat || 1, dLon: dLon || 1, u, v };
}

// Bilinear-interpolate the wind vector at an arbitrary point from the four
// nearest sampled cell centers — this is what makes the flow continuous
// instead of a patchwork of uniform blocks.
function sampleField(f: WindField, lat: number, lon: number): { u: number; v: number; speed: number } {
  const fc = f.cols > 1 ? (lon - f.lonMin) / f.dLon : 0;
  const fr = f.rows > 1 ? (lat - f.latMin) / f.dLat : 0;
  const c0 = Math.floor(fc), r0 = Math.floor(fr);
  const tc = fc - c0, tr = fr - r0;
  const clampIdx = (n: number, max: number) => Math.min(Math.max(n, 0), max);
  const idx = (r: number, c: number) => clampIdx(r, f.rows - 1) * f.cols + clampIdx(c, f.cols - 1);

  const i00 = idx(r0, c0), i10 = idx(r0, c0 + 1), i01 = idx(r0 + 1, c0), i11 = idx(r0 + 1, c0 + 1);
  const u = (f.u[i00] * (1 - tc) + f.u[i10] * tc) * (1 - tr) + (f.u[i01] * (1 - tc) + f.u[i11] * tc) * tr;
  const v = (f.v[i00] * (1 - tc) + f.v[i10] * tc) * (1 - tr) + (f.v[i01] * (1 - tc) + f.v[i11] * tc) * tr;
  return { u, v, speed: Math.hypot(u, v) };
}

function speedColor(t: number, alpha: number): string {
  // calm → soft blue, strong gusts → bright white-cyan, like a live flow map
  const r = Math.round(120 + 135 * t);
  const g = Math.round(170 + 85 * t);
  const b = 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function respawn(p: WParticle, bounds: MapBounds) {
  p.lat = bounds.latMin + Math.random() * (bounds.latMax - bounds.latMin);
  p.lon = bounds.lonMin + Math.random() * (bounds.lonMax - bounds.lonMin);
  p.trailLen = 0;
  p.primed = false;
  p.speedBoost = 0.7 + Math.random() * 0.7;
}

function makeParticle(bounds: MapBounds): WParticle {
  const p: WParticle = {
    lat: 0, lon: 0, trail: new Float32Array(TRAIL_LEN * 2), trailLen: 0, primed: false, speedBoost: 1,
  };
  respawn(p, bounds);
  return p;
}

interface Props {
  getBounds: () => MapBounds | null;
  fetchTrigger: number;
}

export default function WindGridOverlay({ getBounds, fetchTrigger }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const animRef    = useRef<number>(0);
  const fieldRef   = useRef<WindField | null>(null);
  const particlesRef = useRef<WParticle[]>([]);
  const abortRef   = useRef<AbortController | null>(null);

  // Fetch a sparse grid of real per-location readings and turn it into a field.
  useEffect(() => {
    const bounds = getBounds();
    if (!bounds) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const { rows, cols } = gridDims(bounds);
    const dLat = (bounds.latMax - bounds.latMin) / rows;
    const dLon = (bounds.lonMax - bounds.lonMin) / cols;

    const centers: Array<{ lat: number; lon: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        centers.push({
          lat: bounds.latMin + (r + 0.5) * dLat,
          lon: bounds.lonMin + (c + 0.5) * dLon,
        });
      }
    }

    Promise.allSettled(
      centers.map(pt =>
        fetch(`/api/drone-atc/weather?lat=${pt.lat.toFixed(4)}&lon=${pt.lon.toFixed(4)}`, { signal: ctrl.signal })
          .then(r => r.ok ? r.json() : null)
          .then((json): WindCellSample => ({
            latC: pt.lat, lonC: pt.lon,
            windDir:   (json?.current?.wind_direction_10m as number) ?? 270,
            windSpeed: (json?.current?.wind_speed_10m    as number) ?? 4,
          })),
      ),
    ).then(results => {
      if (ctrl.signal.aborted) return;
      const samples: WindCellSample[] = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { latC: centers[i].lat, lonC: centers[i].lon, windDir: 270, windSpeed: 4 },
      );
      fieldRef.current = buildField(samples, rows, cols);
    }).catch(() => {});

    return () => ctrl.abort();
  }, [fetchTrigger, getBounds]);

  // Advect a persistent particle pool through the interpolated field. Particles
  // live in lat/lon space so they track the real map correctly as it pans, and
  // survive data refreshes instead of resetting every fetch.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(draw); return; }

      const W = canvas.offsetWidth  || 800;
      const H = canvas.offsetHeight || 600;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width  = W;
        canvas.height = H;
      }

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      const bounds = getBounds();
      const field  = fieldRef.current;
      const particles = particlesRef.current;

      if (bounds && field) {
        const target = Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, Math.round((W * H) / AREA_PER_PARTICLE)));
        while (particles.length < target) particles.push(makeParticle(bounds));
        if (particles.length > target) particles.length = target;

        const avgCellDeg = (field.dLat + field.dLon) / 2;
        const latPad = (bounds.latMax - bounds.latMin) * 0.02;
        const lonPad = (bounds.lonMax - bounds.lonMin) * 0.02;

        for (const p of particles) {
          const outOfView =
            p.lat < bounds.latMin - latPad || p.lat > bounds.latMax + latPad ||
            p.lon < bounds.lonMin - lonPad || p.lon > bounds.lonMax + lonPad;
          if (outOfView) { respawn(p, bounds); continue; }

          const { u, v, speed } = sampleField(field, p.lat, p.lon);

          if (speed < CALM_SPEED) {
            // near-still air: let existing trail fade out rather than freezing mid-air
            if (p.trailLen > 0) p.trailLen -= 1;
          } else {
            const bearing = Math.atan2(u, v); // compass bearing of travel (0 = N, 90 = E)
            const paceFactor = Math.min(Math.max(speed / REF_SPEED_MS, 0.3), 1.5) * p.speedBoost;
            const stepDeg = avgCellDeg * STEP_FRACTION * paceFactor;
            const latRad = (p.lat * Math.PI) / 180;

            p.lat += Math.cos(bearing) * stepDeg;
            p.lon += (Math.sin(bearing) * stepDeg) / Math.max(Math.cos(latRad), 0.15);

            // push current position to the front of the trail buffer
            const n = Math.min(p.trailLen + 1, TRAIL_LEN);
            for (let i = n - 1; i > 0; i--) {
              p.trail[i * 2] = p.trail[(i - 1) * 2];
              p.trail[i * 2 + 1] = p.trail[(i - 1) * 2 + 1];
            }
            p.trail[0] = p.lat;
            p.trail[1] = p.lon;
            p.trailLen = n;
            p.primed = true;
          }

          if (p.trailLen < 2) continue;

          const t = Math.min(speed / 12, 1);
          const [hx, hy] = geo2px(p.trail[0], p.trail[1], bounds, W, H);

          ctx.beginPath();
          ctx.moveTo(hx, hy);
          for (let i = 1; i < p.trailLen; i++) {
            const [x, y] = geo2px(p.trail[i * 2], p.trail[i * 2 + 1], bounds, W, H);
            ctx.lineTo(x, y);
          }
          const fade = p.trailLen / TRAIL_LEN;
          ctx.strokeStyle = speedColor(t, 0.5 * fade);
          ctx.lineWidth = 1.1 + t * 0.9;
          ctx.stroke();

          const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, 2.4);
          rg.addColorStop(0, speedColor(t, 0.9 * fade));
          rg.addColorStop(1, speedColor(t, 0));
          ctx.beginPath();
          ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
          ctx.fillStyle = rg;
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [getBounds]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[400]"
    />
  );
}
