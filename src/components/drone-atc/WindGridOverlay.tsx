'use client';

import { useEffect, useRef } from 'react';

export interface MapBounds {
  latMin: number; lonMin: number; latMax: number; lonMax: number;
}

interface WindCell {
  gLatMin: number; gLatMax: number;
  gLonMin: number; gLonMax: number;
  windDir: number; windSpeed: number;
}

interface WParticle { lanePos: number; phase: number; }

const PPC    = 100;
const TRAVEL = 0.40;  // visible journey = 40% of dominant cell dimension
const CYCLE  = 0.58;  // full cycle = travel + invisible recovery gap

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

// Evenly distribute particles across the cycle so they never all reset together.
function mkParticles(total: number): WParticle[] {
  return Array.from({ length: total }, (_, i) => ({
    lanePos: i / total,
    phase:   (i / total) * CYCLE,
  }));
}

interface Props {
  getBounds: () => MapBounds | null;
  fetchTrigger: number;
}

export default function WindGridOverlay({ getBounds, fetchTrigger }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const animRef      = useRef<number>(0);
  const cellsRef     = useRef<WindCell[]>([]);
  const particlesRef = useRef<WParticle[][]>([]);
  const abortRef     = useRef<AbortController | null>(null);

  useEffect(() => {
    const bounds = getBounds();
    if (!bounds) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const { rows, cols } = gridDims(bounds);
    const dLat = (bounds.latMax - bounds.latMin) / rows;
    const dLon = (bounds.lonMax - bounds.lonMin) / cols;

    const defs: Array<{
      gLatMin: number; gLatMax: number; gLonMin: number; gLonMax: number;
      lat: number; lon: number;
    }> = [];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = bounds.latMin + r * dLat, n = s + dLat;
        const w = bounds.lonMin + c * dLon, e = w + dLon;
        defs.push({ gLatMin: s, gLatMax: n, gLonMin: w, gLonMax: e, lat: (s + n) / 2, lon: (w + e) / 2 });
      }
    }

    Promise.allSettled(
      defs.map(d =>
        fetch(`/api/drone-atc/weather?lat=${d.lat.toFixed(4)}&lon=${d.lon.toFixed(4)}`, { signal: ctrl.signal })
          .then(r => r.ok ? r.json() : null)
          .then(json => ({
            gLatMin: d.gLatMin, gLatMax: d.gLatMax,
            gLonMin: d.gLonMin, gLonMax: d.gLonMax,
            windDir:   (json?.current?.wind_direction_10m as number) ?? 270,
            windSpeed: (json?.current?.wind_speed_10m    as number) ?? 4,
          }))
      ),
    ).then(results => {
      if (ctrl.signal.aborted) return;
      const cells: WindCell[] = results.map((r, i) =>
        r.status === 'fulfilled'
          ? r.value
          : { gLatMin: defs[i].gLatMin, gLatMax: defs[i].gLatMax,
              gLonMin: defs[i].gLonMin, gLonMax: defs[i].gLonMax,
              windDir: 270, windSpeed: 4 },
      );
      cellsRef.current     = cells;
      particlesRef.current = cells.map(() => mkParticles(PPC));
    }).catch(() => {});

    return () => ctrl.abort();
  }, [fetchTrigger, getBounds]);

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
      const cells  = cellsRef.current;
      const pArrs  = particlesRef.current;

      if (bounds && cells.length > 0) {
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const ps   = pArrs[i];
          if (!ps?.length) continue;

          const [tlX, tlY] = geo2px(cell.gLatMax, cell.gLonMin, bounds, W, H);
          const [brX, brY] = geo2px(cell.gLatMin, cell.gLonMax, bounds, W, H);
          const cw = brX - tlX, ch = brY - tlY;
          if (cw <= 0 || ch <= 0) continue;

          const rad    = (cell.windDir * Math.PI) / 180;
          const spd    = Math.max(cell.windSpeed * 1.1, 2.5);
          const vxPx   = -Math.sin(rad) * spd;
          const vyPx   =  Math.cos(rad) * spd;
          const drx    = vxPx / cw;
          const dry    = vyPx / ch;
          const drMax  = Math.max(Math.abs(drx), Math.abs(dry));
          if (drMax < 1e-5) continue;

          // Dominant component decides which cell edge particles enter from
          const horizEntry = Math.abs(vxPx) >= Math.abs(vyPx);

          for (const p of ps) {
            // Advance phase; wrap at CYCLE to restart from fixed entry point
            p.phase += drMax;
            if (p.phase >= CYCLE) p.phase -= CYCLE;

            // Only draw while in the visible travel portion [0, TRAVEL)
            if (p.phase >= TRAVEL) continue;

            const progress = p.phase / TRAVEL;           // 0 → 1 over the journey
            const alpha    = progress < 0.12 ? progress / 0.12
                           : progress > 0.78 ? (1 - progress) / 0.22
                           : 1;
            if (alpha <= 0.01) continue;

            // Fixed entry position on the cell boundary
            let startRx: number, startRy: number;
            if (horizEntry) {
              startRx = vxPx >= 0 ? 0 : 1;   // left edge for eastward, right for westward
              startRy = p.lanePos;
            } else {
              startRx = p.lanePos;
              startRy = vyPx >= 0 ? 0 : 1;   // top edge for southward, bottom for northward
            }

            // Current position: advance from entry by phase / drMax frames of travel
            const rx = startRx + (drx / drMax) * p.phase;
            const ry = startRy + (dry / drMax) * p.phase;

            const sx = tlX + rx * cw;
            const sy = tlY + ry * ch;
            const tx = sx - vxPx * 8;         // short trail, 8× velocity
            const ty = sy - vyPx * 8;

            const lg = ctx.createLinearGradient(tx, ty, sx, sy);
            lg.addColorStop(0,   'rgba(100,190,255,0)');
            lg.addColorStop(0.5, `rgba(180,230,255,${alpha * 0.3})`);
            lg.addColorStop(1,   `rgba(255,255,255,${alpha * 0.85})`);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = lg;
            ctx.lineWidth   = 1.6;
            ctx.stroke();

            const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 3);
            rg.addColorStop(0,    `rgba(255,255,255,${alpha})`);
            rg.addColorStop(0.45, `rgba(200,240,255,${alpha * 0.5})`);
            rg.addColorStop(1,    'rgba(140,210,255,0)');
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fillStyle = rg;
            ctx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[400]"
    />
  );
}
