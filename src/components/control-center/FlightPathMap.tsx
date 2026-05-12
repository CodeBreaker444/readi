'use client';

import { useEffect, useRef } from 'react';

export interface FlightWaypoint {
  timestamp?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  battery?: number;
  speed_vx?: number;
  speed_vy?: number;
  speed_vz?: number;
  angle_phi?: number;
  angle_theta?: number;
}

interface Props {
  waypoints: FlightWaypoint[];
  height?: string;
  isDark?: boolean;
}

function fmt(v: number | undefined, digits = 2, suffix = ''): string {
  if (v == null) return '—';
  return `${v.toFixed(digits)}${suffix}`;
}

function buildTooltipHtml(wp: FlightWaypoint, index: number): string {
  const rows: [string, string][] = [
    ['Point',    String(index + 1)],
    ['Lat / Lon', wp.latitude != null && wp.longitude != null
      ? `${wp.latitude.toFixed(6)}, ${wp.longitude.toFixed(6)}`
      : '—'],
    ['Altitude',  fmt(wp.altitude, 1, ' m')],
    ['Speed',     fmt(wp.speed, 2, ' m/s')],
    ['Vx / Vy / Vz', `${fmt(wp.speed_vx)} / ${fmt(wp.speed_vy)} / ${fmt(wp.speed_vz)} m/s`],
    ['Heading (ψ)',   fmt(wp.heading, 1, '°')],
    ['Roll (φ)',      fmt(wp.angle_phi, 1, '°')],
    ['Pitch (θ)',     fmt(wp.angle_theta, 1, '°')],
    ['Battery',       fmt(wp.battery, 0, '%')],
  ];

  const rowsHtml = rows
    .map(
      ([label, val]) =>
        `<tr>
          <td style="color:#94a3b8;padding:2px 8px 2px 0;white-space:nowrap;font-size:11px">${label}</td>
          <td style="color:#f1f5f9;font-size:11px;font-family:monospace">${val}</td>
        </tr>`,
    )
    .join('');

  return `<div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:10px 12px;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,0.4)">
    <table style="border-collapse:collapse">${rowsHtml}</table>
  </div>`;
}

export function FlightPathMap({ waypoints, height = '380px', isDark = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const validPoints = waypoints.filter(
      (wp) => wp.latitude != null && wp.longitude != null,
    );
    if (validPoints.length === 0) return;

    // Dynamic Leaflet import to avoid SSR issues
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const lats = validPoints.map((wp) => wp.latitude as number);
      const lons = validPoints.map((wp) => wp.longitude as number);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

      const map = L.map(containerRef.current, {
        center: [centerLat, centerLon],
        zoom: 15,
        zoomControl: true,
        attributionControl: false,
      });
      mapRef.current = map;

      // Dark tile layer
      L.tileLayer(
        isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 },
      ).addTo(map);

      // Flight path polyline
      const latLngs = validPoints.map((wp) => [wp.latitude, wp.longitude] as [number, number]);
      const polyline = L.polyline(latLngs, {
        color: '#7c3aed',
        weight: 3,
        opacity: 0.9,
      }).addTo(map);

      map.fitBounds(polyline.getBounds(), { padding: [32, 32] });

      // Start marker (green)
      const startPoint = validPoints[0];
      L.circleMarker([startPoint.latitude!, startPoint.longitude!], {
        radius: 7,
        fillColor: '#22c55e',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip('Start', { permanent: false, direction: 'top' });

      // End marker (red)
      const endPoint = validPoints[validPoints.length - 1];
      L.circleMarker([endPoint.latitude!, endPoint.longitude!], {
        radius: 7,
        fillColor: '#ef4444',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip('End', { permanent: false, direction: 'top' });

      // Hover markers — sample every 5th point to keep it responsive
      const step = Math.max(1, Math.floor(validPoints.length / 60));
      validPoints.forEach((wp, i) => {
        if (i % step !== 0) return;

        const originalIndex = waypoints.indexOf(wp);
        L.circleMarker([wp.latitude!, wp.longitude!], {
          radius: 5,
          fillColor: '#7c3aed',
          color: isDark ? '#1e1b4b' : '#fff',
          weight: 1.5,
          fillOpacity: 0.7,
          interactive: true,
        })
          .addTo(map)
          .bindTooltip(buildTooltipHtml(wp, originalIndex >= 0 ? originalIndex : i), {
            sticky: true,
            direction: 'top',
            offset: [0, -8],
            opacity: 1,
            className: 'flight-path-tooltip',
          });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <style>{`
        .flight-path-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .flight-path-tooltip::before {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
