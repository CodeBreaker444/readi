'use client';

import { useEffect, useRef, useState } from 'react';
import { DEMO_DRONES_BASE } from './demoData';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

const TICK_MS = 2000;

function nudge(val: number, spread: number) {
  return val + (Math.random() - 0.5) * spread;
}

export function useDemoDrones(): DroneMap {
  const [drones, setDrones] = useState<DroneMap>(() =>
    Object.fromEntries(DEMO_DRONES_BASE.map(d => [d.drone_id, { ...d }]))
  );
  const baseRef = useRef<TelemetryData[]>(DEMO_DRONES_BASE.map(d => ({ ...d })));

  useEffect(() => {
    const timer = setInterval(() => {
      setDrones(prev => {
        const next = { ...prev };
        Object.values(next).forEach(d => {
          next[d.drone_id] = {
            ...d,
            latitude:           d.latitude  + (Math.random() - 0.5) * 0.0003,
            longitude:          d.longitude + (Math.random() - 0.5) * 0.0003,
            altitude:           Math.max(10, Math.min(200, nudge(d.altitude, 3))),
            heading:            (d.heading + nudge(0, 6) + 360) % 360,
            velocity:           Math.max(0, Math.min(20, nudge(d.velocity, 0.5))),
            battery_percentage: Math.max(0, d.battery_percentage - 0.02),
            signal_strength:    d.signal_strength != null ? Math.max(0, Math.min(100, nudge(d.signal_strength, 2))) : undefined,
            timestamp:          Date.now(),
          };
        });
        return next;
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, []);

  return drones;
}
