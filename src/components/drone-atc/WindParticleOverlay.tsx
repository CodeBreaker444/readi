'use client';

import { useEffect, useRef } from 'react';

interface Props {
  windDir: number;   // meteorological: degrees clockwise from N, direction wind blows FROM
  windSpeed: number; // m/s
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

export default function WindParticleOverlay({ windDir, windSpeed }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const setSize = () => {
      canvas.width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 800;
      canvas.height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 600;
    };
    setSize();

    // Meteorological dir = direction FROM which wind blows (clockwise from North).
    // Particle velocity = opposite direction (TO which wind moves).
    // dir=0 (FROM N): particles go south → vy=+
    // dir=90 (FROM E): particles go west → vx=-
    // dir=270 (FROM W): particles go east → vx=+
    const rad = (windDir * Math.PI) / 180;
    const px = Math.max(windSpeed * 1.1, 2.5);
    const baseVx = -Math.sin(rad) * px;
    const baseVy =  Math.cos(rad) * px;
    const variance = px * 0.22;
    const TAIL = 12;

    const spawnParticle = (randomAge: boolean): Particle => {
      const W = canvas.width;
      const H = canvas.height;
      const absVx = Math.abs(baseVx);
      const absVy = Math.abs(baseVy);
      const total = absVx + absVy + 0.001;
      let x: number, y: number;

      if (Math.random() * total < absVx) {
        x = baseVx > 0 ? -(10 + Math.random() * 20) : W + 10 + Math.random() * 20;
        y = Math.random() * H;
      } else {
        x = Math.random() * W;
        y = baseVy > 0 ? -(10 + Math.random() * 20) : H + 10 + Math.random() * 20;
      }

      const life = 40 + Math.random() * 60;
      return {
        x, y,
        vx: baseVx + (Math.random() - 0.5) * variance,
        vy: baseVy + (Math.random() - 0.5) * variance,
        age: randomAge ? Math.random() * life : 0,
        life,
      };
    };

    const particles: Particle[] = Array.from({ length: 260 }, () => spawnParticle(true));

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.age++;

        // Respawn check must come before the alpha skip so particles never get stuck
        if (p.age >= p.life || p.x < -70 || p.x > W + 70 || p.y < -70 || p.y > H + 70) {
          Object.assign(p, spawnParticle(false));
        }

        const t = p.age / p.life;
        const alpha = t < 0.12 ? t / 0.12 : t > 0.70 ? (1 - t) / 0.30 : 1;
        if (alpha <= 0.01) continue;

        const tailX = p.x - p.vx * TAIL;
        const tailY = p.y - p.vy * TAIL;
        const grad = ctx.createLinearGradient(tailX, tailY, p.x, p.y);
        grad.addColorStop(0,    'rgba(100,190,255,0)');
        grad.addColorStop(0.5, `rgba(180,230,255,${alpha * 0.3})`);
        grad.addColorStop(1,   `rgba(255,255,255,${alpha * 0.8})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 3.5);
        grd.addColorStop(0,    `rgba(255,255,255,${alpha})`);
        grd.addColorStop(0.45, `rgba(200,240,255,${alpha * 0.55})`);
        grd.addColorStop(1,    'rgba(140,210,255,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas.parentElement ?? canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [windDir, windSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-400 rounded-2xl"
    />
  );
}
