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

interface WParticle { rx: number; ry: number; age: number; life: number; }

const PPC = 50;

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

function geo2px(
  lat: number, lon: number,
  b: MapBounds, W: number, H: number,
): [number, number] {
  const x   = ((lon - b.lonMin) / (b.lonMax - b.lonMin)) * W;
  const mN  = toMerc(b.latMax);
  const mS  = toMerc(b.latMin);
  const y   = ((mN - toMerc(lat)) / (mN - mS)) * H;
  return [x, y];
}

function mkParticle(vxPx: number, vyPx: number, init: boolean): WParticle {
  const life = 50 + Math.random() * 60;
  if (init) return { rx: Math.random(), ry: Math.random(), age: Math.random() * life, life };
  const ax = Math.abs(vxPx), ay = Math.abs(vyPx), tot = ax + ay + 0.001;
  let rx: number, ry: number;
  if (Math.random() * tot < ax) { rx = vxPx > 0 ? -0.05 : 1.05; ry = Math.random(); }
  else                           { rx = Math.random(); ry = vyPx > 0 ? -0.05 : 1.05; }
  return { rx, ry, age: 0, life };
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
        fetch(
          `/api/drone-atc/weather?lat=${d.lat.toFixed(4)}&lon=${d.lon.toFixed(4)}`,
          { signal: ctrl.signal },
        )
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
      particlesRef.current = cells.map(() =>
        Array.from({ length: PPC }, () => mkParticle(0, 1, true)),
      );
    }).catch(() => {});

    return () => ctrl.abort();
  }, [fetchTrigger, getBounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) { animRef.current = requestAnimationFrame(draw); return; }

      // Sync canvas pixel buffer to CSS layout size
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
          const cw = brX - tlX;
          const ch = brY - tlY;
          if (cw <= 0 || ch <= 0) continue;

          const rad  = (cell.windDir * Math.PI) / 180;
          const spd  = Math.max(cell.windSpeed * 1.1, 2.5);
          const vxPx = -Math.sin(rad) * spd;
          const vyPx =  Math.cos(rad) * spd;
          const drx  = vxPx / cw;
          const dry  = vyPx / ch;

          for (const p of ps) {
            p.rx  += drx;
            p.ry  += dry;
            p.age++;

            if (
              p.age >= p.life ||
              p.rx < -0.12 || p.rx > 1.12 ||
              p.ry < -0.12 || p.ry > 1.12
            ) {
              const n = mkParticle(vxPx, vyPx, false);
              p.rx = n.rx; p.ry = n.ry; p.age = 0; p.life = n.life;
              continue;
            }

            const t     = p.age / p.life;
            const alpha = t < 0.12 ? t / 0.12 : t > 0.70 ? (1 - t) / 0.30 : 1;
            if (alpha <= 0.01) continue;

            const sx = tlX + p.rx * cw;
            const sy = tlY + p.ry * ch;
            const tx = sx - vxPx * 12;
            const ty = sy - vyPx * 12;

            const lg = ctx.createLinearGradient(tx, ty, sx, sy);
            lg.addColorStop(0,   'rgba(100,190,255,0)');
            lg.addColorStop(0.5, `rgba(180,230,255,${alpha * 0.3})`);
            lg.addColorStop(1,   `rgba(255,255,255,${alpha * 0.8})`);
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(sx, sy);
            ctx.strokeStyle = lg;
            ctx.lineWidth   = 1.8;
            ctx.stroke();

            const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 3.5);
            rg.addColorStop(0,    `rgba(255,255,255,${alpha})`);
            rg.addColorStop(0.45, `rgba(200,240,255,${alpha * 0.55})`);
            rg.addColorStop(1,    'rgba(140,210,255,0)');
            ctx.beginPath();
            ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
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
  }, []);  

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[400]"
    />
  );
}
