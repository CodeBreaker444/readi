'use client';

import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LayerVisibility } from './LayerControlPanel';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

interface DroneATCMapProps {
  drones: DroneMap;
  docks: DroneMap;
  aircraft: AircraftState[];
  selectedDroneId: string | null;
  layers: LayerVisibility;
  onDroneClick: (droneId: string) => void;
  isDark: boolean;
  owmApiKey: string;
  onBoundsChange?: (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => void;
}

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const ITALY_BOUNDS = { south: 36.0, west: 6.5, north: 47.5, east: 18.5 } as const;
const ITALY_CENTER: [number, number] = [41.9, 12.5];
const ITALY_ZOOM = 6;

const OWM_LAYERS: Record<string, string> = {
  wind: 'wind', temp: 'temp', clouds: 'clouds', precip: 'precipitation', pressure: 'pressure',
};
const OWM_OPACITY: Record<string, number> = {
  wind: 0.6, temp: 0.6, clouds: 0.5, precip: 0.7, pressure: 0.5,
};

function owmTileUrl(layer: string, apiKey: string) {
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${apiKey}`;
}

function altColor(alt: number | null): string {
  if (alt === null || alt < 0) return '#94a3b8';
  if (alt < 1000) return '#ef4444';
  if (alt < 5000) return '#fb923c';
  if (alt < 10000) return '#f59e0b';
  return '#34d399';
}
function droneIcon(selected: boolean, status?: string, name?: string): L.DivIcon {
  const isOnline = status === 'online' || !status;
  const isStandby = status === 'standby';
  const color = isOnline
    ? (selected ? '#a78bfa' : '#8b5cf6')
    : isStandby
      ? '#f59e0b'
      : '#6b7280';
  const size = selected ? 48 : 36;
  const s = size / 48;
  const armLen = 14 * s;
  const motorR = 5.5 * s;
  const hubR = 5 * s;
  const cx = size / 2;
  const cy = size / 2;

  const glowR = selected ? cx * 1.2 : cx * 0.95;
  const glowOpacity = selected ? '0.20' : isOnline ? '0.12' : isStandby ? '0.10' : '0.04';

  const motors = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

  const motorsSvg = motors.map(([dx, dy]) => {
    const mx = cx + dx * armLen;
    const my = cy + dy * armLen;
    return `
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="${color}" stroke-width="${1.6 * s}" stroke-linecap="round" opacity="0.82"/>
      <circle cx="${mx}" cy="${my}" r="${motorR}" fill="${color}" fill-opacity="0.10" stroke="${color}" stroke-width="${1.1 * s}"/>
      <circle cx="${mx}" cy="${my}" r="${1.8 * s}" fill="${color}" fill-opacity="0.55"/>`;
  }).join('');

  const ring = selected
    ? `<circle cx="${cx}" cy="${cy}" r="${cx * 0.88}" fill="none" stroke="${color}" stroke-width="${0.8 * s}" stroke-dasharray="${4 * s} ${2.5 * s}" stroke-opacity="0.5"/>`
    : (!isOnline && !isStandby)
      ? `<circle cx="${cx}" cy="${cy}" r="${cx * 0.92}" fill="none" stroke="${color}" stroke-width="${0.8 * s}" stroke-dasharray="3 3" stroke-opacity="0.5"/>`
      : '';

  const safeName = name ? name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const nameBg = 'rgba(10,12,20,0.65)';
  const nameLabel = safeName
    ? `<div style="position:absolute;bottom:${size + 3}px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:600;color:#fff;background:${nameBg};padding:1px 5px;border-radius:3px;pointer-events:none;letter-spacing:0.2px;">${safeName}</div>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${nameLabel}
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="${color}" fill-opacity="${glowOpacity}"/>
        ${ring}
        ${motorsSvg}
        <rect x="${cx - hubR}" y="${cy - hubR}" width="${hubR * 2}" height="${hubR * 2}" rx="${2 * s}" fill="${color}" stroke="rgba(255,255,255,0.92)" stroke-width="${1.1 * s}"/>
        <circle cx="${cx}" cy="${cy + 0.4 * s}" r="${2 * s}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.42)" stroke-width="${0.5 * s}"/>
        <circle cx="${cx}" cy="${cy + 0.4 * s}" r="${0.9 * s}" fill="${color}" fill-opacity="0.82"/>
        <polygon points="${cx},${cy - 7 * s} ${cx + 1.8 * s},${cy - 4.5 * s} ${cx - 1.8 * s},${cy - 4.5 * s}" fill="white" fill-opacity="0.88"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [cx, cy],
  });
}


function aircraftIcon(heading?: number | null, altitude?: number | null): L.DivIcon {
  const deg = heading ?? 0;
  const color = altColor(altitude ?? null);

  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;transform:rotate(${deg}deg);display:flex;align-items:center;justify-content:center;">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Fuselage -->
        <path d="M16 1 Q17.2 4 17.2 8 L17.2 11.5 L27 16.5 L27 18 L17.2 15.5 L17.2 24.5 L20.5 27 L20.5 28.5 L16 27 L11.5 28.5 L11.5 27 L14.8 24.5 L14.8 15.5 L5 18 L5 16.5 L14.8 11.5 L14.8 8 Q14.8 4 16 1Z"
          fill="${color}" stroke="rgba(0,0,0,0.4)" stroke-width="0.5" stroke-linejoin="round"/>
        <!-- Cockpit glass -->
        <ellipse cx="16" cy="5" rx="0.7" ry="2" fill="rgba(255,255,255,0.35)"/>
        <!-- Wing highlight -->
        <line x1="14.8" y1="13" x2="5.5" y2="17" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
        <line x1="17.2" y1="13" x2="26.5" y2="17" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function dockIcon(status?: string, name?: string): L.DivIcon {
  const isOnline = status === 'online' || !status;
  const isStandby = status === 'standby';
  const color = isOnline ? '#06b6d4' : isStandby ? '#f59e0b' : '#6b7280';
  const size = 36;
  const cx = size / 2;
  const cy = size / 2;
  const glowOpacity = isOnline ? '0.14' : isStandby ? '0.10' : '0.04';

  const safeName = name ? name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const nameLabel = safeName
    ? `<div style="position:absolute;bottom:${size + 3}px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-weight:600;color:#fff;background:rgba(10,12,20,0.65);padding:1px 5px;border-radius:3px;pointer-events:none;letter-spacing:0.2px;">${safeName}</div>`
    : '';

  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${nameLabel}
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${cx}" cy="${cy}" r="${cx * 0.95}" fill="${color}" fill-opacity="${glowOpacity}"/>
        <rect x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="3" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5"/>
        <line x1="${cx - 6}" y1="${cy}" x2="${cx + 6}" y2="${cy}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
        <line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy + 6}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="2.5" fill="${color}"/>
        <rect x="${cx - 11}" y="${cy + 10}" width="22" height="3" rx="1.5" fill="${color}" fill-opacity="0.6"/>
      </svg>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [cx, cy],
  });
}

interface AirspaceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  class: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  color: string;
}


async function fetchAirspaceForRegion(
  south: number, west: number, north: number, east: number,
  signal?: AbortSignal,
): Promise<AirspaceZone[]> {
  try {
    const params = new URLSearchParams({
      south: south.toFixed(4),
      west: west.toFixed(4),
      north: north.toFixed(4),
      east: east.toFixed(4),
    });

    const res = await fetch(`/api/drone-atc/airspace?${params}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.warn('[DroneATCMap] Airspace API error:', res.status);
      return [];
    }

    const data = await res.json();
    const zones: AirspaceZone[] = (data.airspace ?? []).map((zone: any) => ({
      id: zone.id,
      name: zone.name,
      lat: zone.lat,
      lon: zone.lon,
      radiusM: zone.radiusM,
      class: zone.class,
      color: getAirspaceColor(zone.class),
    }));

    return zones;
  } catch (err) {
    console.error('[DroneATCMap] Failed to fetch airspace:', err);
    return [];
  }
}

function getAirspaceColor(cls: string): string {
  const colors: Record<string, string> = {
    A: '#dc2626', // Red - Most restricted
    B: '#3b82f6', // Blue
    C: '#a855f7', // Purple
    D: '#06b6d4', // Cyan
  };
  return colors[cls] ?? '#6b7280';
}

type WeatherLayerKey = 'wind' | 'temp' | 'clouds' | 'precip' | 'pressure';
const WEATHER_KEYS: WeatherLayerKey[] = ['wind', 'temp', 'clouds', 'precip', 'pressure'];

export default function DroneATCMap({
  drones, docks, aircraft, selectedDroneId, layers, onDroneClick, isDark, owmApiKey, onBoundsChange,
}: DroneATCMapProps) {
  const [airspaceZones, setAirspaceZones] = useState<AirspaceZone[]>([]);
  const lastAirspaceFetchRef = useRef<L.LatLngBounds | null>(null);
  const airspaceFetchAbortRef = useRef<AbortController | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const droneLayerRef = useRef<L.LayerGroup | null>(null);
  const dockLayerRef = useRef<L.LayerGroup | null>(null);
  const flightLayerRef = useRef<L.LayerGroup | null>(null);
  const airspaceLayerRef = useRef<L.LayerGroup | null>(null);
  const weatherRefs = useRef<Partial<Record<WeatherLayerKey, L.TileLayer>>>({});
  const droneMarkersRef = useRef<Record<string, L.Marker>>({});
  const dockMarkersRef = useRef<Record<string, L.Marker>>({});
  const flightMarkersRef = useRef<Record<string, L.Marker>>({});
  const cloudCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cloudAnimRef = useRef<number>(0);
  const precipCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const precipAnimRef = useRef<number>(0);

  // Cloud drift animation
  const startCloudAnimation = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!cloudCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:340;';
      container.appendChild(canvas);
      cloudCanvasRef.current = canvas;
    }

    const canvas = cloudCanvasRef.current;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    // Cloud puff: a cluster of overlapping circles
    const clouds = Array.from({ length: 18 }, () => ({
      x: Math.random() * W,
      y: 60 + Math.random() * (H * 0.55),
      r: 28 + Math.random() * 38,
      speed: 0.18 + Math.random() * 0.25,
      alpha: 0.10 + Math.random() * 0.13,
      puffs: Array.from({ length: 4 + Math.floor(Math.random() * 3) }, (_, i) => ({
        dx: (i - 2) * 18 + (Math.random() - 0.5) * 10,
        dy: (Math.random() - 0.5) * 14,
        rs: 0.7 + Math.random() * 0.55,
      })),
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const c of clouds) {
        c.x += c.speed;
        if (c.x - c.r * 3 > W) { c.x = -c.r * 3; c.y = 60 + Math.random() * (H * 0.55); }

        ctx.save();
        ctx.globalAlpha = c.alpha;
        for (const p of c.puffs) {
          const grad = ctx.createRadialGradient(
            c.x + p.dx, c.y + p.dy, 0,
            c.x + p.dx, c.y + p.dy, c.r * p.rs,
          );
          grad.addColorStop(0, 'rgba(220,230,255,0.95)');
          grad.addColorStop(0.6, 'rgba(200,215,255,0.5)');
          grad.addColorStop(1, 'rgba(180,200,255,0)');
          ctx.beginPath();
          ctx.arc(c.x + p.dx, c.y + p.dy, c.r * p.rs, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
        ctx.restore();
      }
      cloudAnimRef.current = requestAnimationFrame(draw);
    };
    cloudAnimRef.current = requestAnimationFrame(draw);
  }, []);

  const stopCloudAnimation = useCallback(() => {
    cancelAnimationFrame(cloudAnimRef.current);
    const canvas = cloudCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Rain / precip animation
  const startPrecipAnimation = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!precipCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:345;';
      container.appendChild(canvas);
      precipCanvasRef.current = canvas;
    }

    const canvas = precipCanvasRef.current;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    const drops = Array.from({ length: 260 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      len: 8 + Math.random() * 14,
      speed: 4.5 + Math.random() * 4,
      alpha: 0.18 + Math.random() * 0.28,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      for (const d of drops) {
        d.y += d.speed;
        d.x -= d.speed * 0.18; // slight diagonal
        if (d.y > H + d.len) { d.y = -d.len; d.x = Math.random() * W; }
        if (d.x < -10) { d.x = W + Math.random() * 20; }

        const grad = ctx.createLinearGradient(d.x, d.y, d.x - d.len * 0.18, d.y + d.len);
        grad.addColorStop(0, `rgba(147,210,255,0)`);
        grad.addColorStop(0.4, `rgba(147,210,255,${d.alpha})`);
        grad.addColorStop(1, `rgba(100,180,255,${d.alpha * 0.6})`);

        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.18, d.y + d.len);
        ctx.strokeStyle = grad;
        ctx.stroke();
      }
      precipAnimRef.current = requestAnimationFrame(draw);
    };
    precipAnimRef.current = requestAnimationFrame(draw);
  }, []);

  const stopPrecipAnimation = useCallback(() => {
    cancelAnimationFrame(precipAnimRef.current);
    const canvas = precipCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const doFetchAirspace = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getZoom() < 5) return;
    const bounds = map.getBounds();
    const last = lastAirspaceFetchRef.current;
    if (last && last.pad(-0.15).contains(bounds)) return;
    const padded = bounds.pad(0.4);
    lastAirspaceFetchRef.current = padded;
    airspaceFetchAbortRef.current?.abort();
    const ctrl = new AbortController();
    airspaceFetchAbortRef.current = ctrl;
    const s = Math.max(padded.getSouth(), ITALY_BOUNDS.south);
    const w = Math.max(padded.getWest(), ITALY_BOUNDS.west);
    const n = Math.min(padded.getNorth(), ITALY_BOUNDS.north);
    const e = Math.min(padded.getEast(), ITALY_BOUNDS.east);
    fetchAirspaceForRegion(s, w, n, e, ctrl.signal)
      .then(zones => {
        if (ctrl.signal.aborted) return;
        setAirspaceZones(prev => {
          const byId = new Map(prev.map(z => [z.id, z]));
          zones.forEach(z => byId.set(z.id, z));
          return Array.from(byId.values());
        });
      })
      .catch(() => {});
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ITALY_CENTER,
      zoom: ITALY_ZOOM,
      zoomControl: true,
      maxBounds: [[ITALY_BOUNDS.south - 1, ITALY_BOUNDS.west - 1], [ITALY_BOUNDS.north + 1, ITALY_BOUNDS.east + 1]],
      maxBoundsViscosity: 0.85,
    });

    // Custom pane so drones always render above aircraft
    const dronePane = map.createPane('dronePane');
    dronePane.style.zIndex = '615';

    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(map);

    const airspaceLayer = L.layerGroup().addTo(map);
    const flightLayer = L.layerGroup().addTo(map);
    const dockLayer = L.layerGroup().addTo(map);
    const droneLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    tileLayerRef.current = tile;
    droneLayerRef.current = droneLayer;
    dockLayerRef.current = dockLayer;
    flightLayerRef.current = flightLayer;
    airspaceLayerRef.current = airspaceLayer;

    const observer = new ResizeObserver(() => {
      setTimeout(() => map.invalidateSize(), 50);
    });
    observer.observe(containerRef.current!);

    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChange?.({ latMin: b.getSouth(), lonMin: b.getWest(), latMax: b.getNorth(), lonMax: b.getEast() });
    };
    map.on('moveend', emitBounds);
    map.on('zoomend', emitBounds);
    emitBounds();

    map.on('moveend', doFetchAirspace);
    map.on('zoomend', doFetchAirspace);
    doFetchAirspace();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(cloudAnimRef.current);
      cancelAnimationFrame(precipAnimRef.current);
      if (cloudCanvasRef.current)  { cloudCanvasRef.current.remove();  cloudCanvasRef.current  = null; }
      if (precipCanvasRef.current) { precipCanvasRef.current.remove(); precipCanvasRef.current = null; }
      map.remove();
      mapRef.current = null;
      droneLayerRef.current = null;
      dockLayerRef.current = null;
      flightLayerRef.current = null;
      airspaceLayerRef.current = null;
      droneMarkersRef.current = {};
      dockMarkersRef.current = {};
      flightMarkersRef.current = {};
    };
  }, []);

  // Theme tile swap
  useEffect(() => {
    tileLayerRef.current?.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
  }, [isDark]);

  // Weather tile layers (OWM)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    WEATHER_KEYS.forEach((key) => {
      if (key === 'wind') return; // handled by particle canvas, not OWM tile
      const visible = layers[key];
      const existing = weatherRefs.current[key];
      if (visible && owmApiKey) {
        if (!existing) {
          const layer = L.tileLayer(owmTileUrl(OWM_LAYERS[key], owmApiKey), {
            opacity: OWM_OPACITY[key], maxZoom: 18, attribution: '© OpenWeatherMap', zIndex: 300,
          }).addTo(map);
          weatherRefs.current[key] = layer;
        }
      } else if (existing) {
        existing.remove();
        delete weatherRefs.current[key];
      }
    });
  }, [layers.wind, layers.temp, layers.clouds, layers.precip, layers.pressure, owmApiKey]);

  // Cloud drift animation
  useEffect(() => {
    if (layers.clouds) startCloudAnimation();
    else stopCloudAnimation();
    return () => stopCloudAnimation();
  }, [layers.clouds, startCloudAnimation, stopCloudAnimation]);

  // Rain / precip animation
  useEffect(() => {
    if (layers.precip) startPrecipAnimation();
    else stopPrecipAnimation();
    return () => stopPrecipAnimation();
  }, [layers.precip, startPrecipAnimation, stopPrecipAnimation]);

  // Trigger airspace fetch whenever any airspace layer is toggled on
  useEffect(() => {
    if (layers.airspaceA || layers.airspaceB || layers.airspaceC || layers.airspaceD) {
      doFetchAirspace();
    }
  }, [layers.airspaceA, layers.airspaceB, layers.airspaceC, layers.airspaceD, doFetchAirspace]);

  // Airspace circle overlays
  useEffect(() => {
    const layer = airspaceLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    airspaceZones.forEach(zone => {
      const key = `airspace${zone.class}` as keyof LayerVisibility;
      if (!(layers[key] as boolean)) return;

      L.circle([zone.lat, zone.lon], {
        radius: zone.radiusM,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.05,
        weight: 1.5,
        opacity: 0.7,
        dashArray: zone.class === 'D' ? '4 4' : undefined,
        interactive: true,
      })
        .bindTooltip(`<b>Class ${zone.class}</b> &mdash; ${zone.name}`, { permanent: false, direction: 'center' })
        .addTo(layer);
    });
  }, [airspaceZones, layers.airspaceA, layers.airspaceB, layers.airspaceC, layers.airspaceD]);

  const updateDroneMarkers = useCallback(() => {
    const layer = droneLayerRef.current;
    if (!layer) return;
    if (!layers.drones) { layer.clearLayers(); droneMarkersRef.current = {}; return; }

    const existing = droneMarkersRef.current;
    const seen = new Set<string>();

    Object.values(drones).forEach((d: TelemetryData) => {
      if (!d.latitude && !d.longitude) return;
      seen.add(d.drone_id);
      const selected = d.drone_id === selectedDroneId;
      const icon = droneIcon(selected, d.status, d.name ?? d.drone_id);
      if (existing[d.drone_id]) {
        existing[d.drone_id].setLatLng([d.latitude, d.longitude]).setIcon(icon);
      } else {
        const marker = L.marker([d.latitude, d.longitude], { icon, pane: 'dronePane' })
          .bindTooltip(`${Math.round(d.battery_percentage)}% batt · ${Math.round(d.altitude)}m`, {
            permanent: false, direction: 'top',
          })
          .on('click', () => onDroneClick(d.drone_id));
        marker.addTo(layer);
        existing[d.drone_id] = marker;
      }
    });

    Object.keys(existing).forEach(id => {
      if (!seen.has(id)) { existing[id].remove(); delete existing[id]; }
    });
  }, [drones, selectedDroneId, layers.drones, onDroneClick]);

  const updateDockMarkers = useCallback(() => {
    const layer = dockLayerRef.current;
    if (!layer) return;

    const existing = dockMarkersRef.current;
    const seen = new Set<string>();

    Object.values(docks).forEach((d: TelemetryData) => {
      if (!d.latitude && !d.longitude) return;
      seen.add(d.drone_id);
      const icon = dockIcon(d.status, d.name ?? d.drone_id);
      if (existing[d.drone_id]) {
        existing[d.drone_id].setLatLng([d.latitude, d.longitude]).setIcon(icon);
      } else {
        const marker = L.marker([d.latitude, d.longitude], { icon })
          .bindTooltip(`${d.name ?? d.drone_id} · ${d.model ?? 'Dock'}`, { permanent: false, direction: 'top' })
          .on('click', () => onDroneClick(d.drone_id));
        marker.addTo(layer);
        existing[d.drone_id] = marker;
      }
    });

    Object.keys(existing).forEach(id => {
      if (!seen.has(id)) { existing[id].remove(); delete existing[id]; }
    });
  }, [docks, onDroneClick]);

  // Aircraft markers
  const updateFlightMarkers = useCallback(() => {
    const layer = flightLayerRef.current;
    if (!layer) return;
    if (!layers.flights) { layer.clearLayers(); flightMarkersRef.current = {}; return; }

    const existing = flightMarkersRef.current;
    const seen = new Set<string>();

    aircraft.forEach(ac => {
      if (!ac.latitude || !ac.longitude) return;
      seen.add(ac.icao24);
      if (existing[ac.icao24]) {
        existing[ac.icao24].setLatLng([ac.latitude, ac.longitude]).setIcon(aircraftIcon(ac.heading, ac.altitude));
      } else {
        const alt = ac.altitude ? `${Math.round(ac.altitude)}m` : '?';
        const spd = ac.velocity ? `${Math.round(ac.velocity * 1.944)}kts` : '';
        const marker = L.marker([ac.latitude, ac.longitude], { icon: aircraftIcon(ac.heading, ac.altitude) })
          .bindTooltip(
            `<strong>${ac.callsign?.trim() || ac.icao24}</strong> · ${alt}${spd ? ` · ${spd}` : ''}`,
            { permanent: false, direction: 'top' },
          );
        marker.addTo(layer);
        existing[ac.icao24] = marker;
      }
    });

    Object.keys(existing).forEach(id => {
      if (!seen.has(id)) { existing[id].remove(); delete existing[id]; }
    });
  }, [aircraft, layers.flights]);

  useEffect(() => { updateDroneMarkers(); }, [updateDroneMarkers]);
  useEffect(() => { updateDockMarkers(); }, [updateDockMarkers]);
  useEffect(() => { updateFlightMarkers(); }, [updateFlightMarkers]);

  // Fly to selected drone or dock
  useEffect(() => {
    if (!selectedDroneId || !mapRef.current) return;
    const target = drones[selectedDroneId] ?? docks[selectedDroneId];
    if (!target || (!target.latitude && !target.longitude)) return;
    mapRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 1.2 });
  }, [selectedDroneId]);

  return (
    <div className="relative w-full h-full" id="drone-atc-map-root">
      {/* Push Leaflet zoom control down so it clears the flight-count badge */}
      <style>{`#drone-atc-map-root .leaflet-top.leaflet-left { margin-top: 44px; }`}</style>
      <div ref={containerRef} className="w-full h-full z-0" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto select-none group">
        <div className="text-[10px] font-medium tracking-wide px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm text-white/60 flex items-center whitespace-nowrap transition-all">
          <span>Powered by&nbsp;</span>

          <div className="flex items-center font-semibold text-white/80 transition-all duration-500">
            <span>P</span>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[50px] group-hover:opacity-100 transition-all duration-500 ease-in-out">eriodical&nbsp;</span>

            <span className="ml-0">D</span>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[30px] group-hover:opacity-100 transition-all duration-500 ease-in-out">ata&nbsp;</span>

            <span className="ml-0">F</span>
            <span className="max-w-0 overflow-hidden opacity-0 group-hover:max-w-[40px] group-hover:opacity-100 transition-all duration-500 ease-in-out">usion</span>
          </div>
          <span>&nbsp;Engine</span>
        </div>
      </div>
    </div>
  );
}
