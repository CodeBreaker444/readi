'use client';

import type { AircraftState } from '@/app/api/drone-atc/flights/route';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef } from 'react';
import type { LayerVisibility } from './LayerControlPanel';
import type { DroneMap, TelemetryData } from './useDroneATCSocket';

interface DroneATCMapProps {
  drones: DroneMap;
  aircraft: AircraftState[];
  selectedDroneId: string | null;
  layers: LayerVisibility;
  onDroneClick: (droneId: string) => void;
  isDark: boolean;
  owmApiKey: string;
  onBoundsChange?: (bounds: { latMin: number; lonMin: number; latMax: number; lonMax: number }) => void;
}

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
  if (alt < 1000)  return '#ef4444';
  if (alt < 5000)  return '#fb923c';
  if (alt < 10000) return '#f59e0b';
  return '#34d399';
}
function droneIcon(selected: boolean, status?: string): L.DivIcon {
  const isOnline = status === 'online' || !status;
  const color = isOnline ? (selected ? '#8b5cf6' : '#10b981') : '#6b7280';
  const size = selected ? 48 : 36;
  const s = size / 48; // scale factor
  const armLen = 14 * s;
  const motorR = 5.5 * s;
  const hubR = 5 * s;
  const cx = size / 2;
  const cy = size / 2;

  const glowR = selected ? cx * 1.15 : cx * 0.92;
  const glowOpacity = selected ? '0.10' : '0.05';

  const motors = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

  const motorsSvg = motors.map(([dx, dy]) => {
    const mx = cx + dx * armLen;
    const my = cy + dy * armLen;
    return `
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="${color}" stroke-width="${1.6 * s}" stroke-linecap="round" opacity="0.82"/>
      <circle cx="${mx}" cy="${my}" r="${motorR}" fill="${color}" fill-opacity="0.10" stroke="${color}" stroke-width="${1.1 * s}"/>
      <circle cx="${mx}" cy="${my}" r="${1.8 * s}" fill="${color}" fill-opacity="0.55"/>`;
  }).join('');

  const selectionRing = selected
    ? `<circle cx="${cx}" cy="${cy}" r="${cx * 0.88}" fill="none" stroke="${color}" stroke-width="${0.8 * s}" stroke-dasharray="${4 * s} ${2.5 * s}" stroke-opacity="0.4"/>`
    : '';

  return L.divIcon({
    className: '',
    html: `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${glowR}" fill="${color}" fill-opacity="${glowOpacity}"/>
      ${selectionRing}
      ${motorsSvg}
      <rect x="${cx - hubR}" y="${cy - hubR}" width="${hubR * 2}" height="${hubR * 2}" rx="${2 * s}" fill="${color}" stroke="rgba(255,255,255,0.92)" stroke-width="${1.1 * s}"/>
      <circle cx="${cx}" cy="${cy + 0.4 * s}" r="${2 * s}" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.42)" stroke-width="${0.5 * s}"/>
      <circle cx="${cx}" cy="${cy + 0.4 * s}" r="${0.9 * s}" fill="${color}" fill-opacity="0.82"/>
      <polygon points="${cx},${cy - 7 * s} ${cx + 1.8 * s},${cy - 4.5 * s} ${cx - 1.8 * s},${cy - 4.5 * s}" fill="white" fill-opacity="0.88"/>
    </svg>`,
    iconSize: [size, size],
    iconAnchor: [cx, cy],
  });
}


function aircraftIcon(heading?: number | null, altitude?: number | null): L.DivIcon {
  const deg = heading ?? 0;
  const color = altColor(altitude ?? null);

  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;transform:rotate(${deg}deg);display:flex;align-items:center;justify-content:center;">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2 L16.8 9.5 L25 12 L25 14.5 L16.8 13 L17.5 22 L20 23.5 L20 25 L14 23.5 L8 25 L8 23.5 L10.5 22 L11.2 13 L3 14.5 L3 12 L11.2 9.5 Z"
          fill="${color}" stroke="rgba(255,255,255,0.85)" stroke-width="0.7" stroke-linejoin="round"/>
        <ellipse cx="14" cy="5.5" rx="0.9" ry="1.6" fill="rgba(255,255,255,0.3)"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface AirspaceZone {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  class: 'A' | 'B' | 'C' | 'D';
  color: string;
}

const AIRSPACE_ZONES: AirspaceZone[] = [
  // Class B — major airports (blue, ~30 nm radius)
  { id: 'FCO-B', name: 'Rome FCO',     lat: 41.7999, lon: 12.2462, radiusM: 55560, class: 'B', color: '#3b82f6' },
  { id: 'MXP-B', name: 'Milan MXP',    lat: 45.6306, lon:  8.7281, radiusM: 55560, class: 'B', color: '#3b82f6' },
  { id: 'VCE-B', name: 'Venice VCE',   lat: 45.5053, lon: 12.3519, radiusM: 37040, class: 'B', color: '#3b82f6' },
  { id: 'NAP-B', name: 'Naples NAP',   lat: 40.8860, lon: 14.2908, radiusM: 37040, class: 'B', color: '#3b82f6' },
  // Class C — secondary airports (purple, ~15 nm)
  { id: 'FCO-C', name: 'Rome TCA',     lat: 41.7999, lon: 12.2462, radiusM: 27780, class: 'C', color: '#a855f7' },
  { id: 'MXP-C', name: 'Milan TCA',    lat: 45.6306, lon:  8.7281, radiusM: 27780, class: 'C', color: '#a855f7' },
  { id: 'BLQ-C', name: 'Bologna BLQ',  lat: 44.5354, lon: 11.2888, radiusM: 18520, class: 'C', color: '#a855f7' },
  { id: 'TRN-C', name: 'Turin TRN',    lat: 45.2009, lon:  7.6494, radiusM: 18520, class: 'C', color: '#a855f7' },
  // Class D — smaller airports (cyan, ~5 nm)
  { id: 'FLR-D', name: 'Florence FLR', lat: 43.8099, lon: 11.2051, radiusM:  9260, class: 'D', color: '#06b6d4' },
  { id: 'CTA-D', name: 'Catania CTA',  lat: 37.4668, lon: 15.0664, radiusM:  9260, class: 'D', color: '#06b6d4' },
  { id: 'PMO-D', name: 'Palermo PMO',  lat: 38.1799, lon: 13.0991, radiusM:  9260, class: 'D', color: '#06b6d4' },
  { id: 'BRI-D', name: 'Bari BRI',     lat: 41.1389, lon: 16.7606, radiusM:  9260, class: 'D', color: '#06b6d4' },
  // Class A — high-altitude controlled airspace above Italy (red, wide polygon approximated as large circle)
  { id: 'ITA-A', name: 'Italy Class A', lat: 43.0, lon: 12.5, radiusM: 370400, class: 'A', color: '#ef4444' },
];

type WeatherLayerKey = 'wind' | 'temp' | 'clouds' | 'precip' | 'pressure';
const WEATHER_KEYS: WeatherLayerKey[] = ['wind', 'temp', 'clouds', 'precip', 'pressure'];

export default function DroneATCMap({
  drones, aircraft, selectedDroneId, layers, onDroneClick, isDark, owmApiKey, onBoundsChange,
}: DroneATCMapProps) {
  const mapRef            = useRef<L.Map | null>(null);
  const containerRef      = useRef<HTMLDivElement>(null);
  const tileLayerRef      = useRef<L.TileLayer | null>(null);
  const droneLayerRef     = useRef<L.LayerGroup | null>(null);
  const flightLayerRef    = useRef<L.LayerGroup | null>(null);
  const airspaceLayerRef  = useRef<L.LayerGroup | null>(null);
  const weatherRefs       = useRef<Partial<Record<WeatherLayerKey, L.TileLayer>>>({});
  const droneMarkersRef   = useRef<Record<string, L.Marker>>({});
  const flightMarkersRef  = useRef<Record<string, L.Marker>>({});
  const windCanvasRef     = useRef<HTMLCanvasElement | null>(null);
  const windAnimRef       = useRef<number>(0);

  // Windy-style particle animation
  const startWindAnimation = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!windCanvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:350;';
      container.appendChild(canvas);
      windCanvasRef.current = canvas;
    }

    const canvas = windCanvasRef.current;
    canvas.width  = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    const particles = Array.from({ length: 320 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: -(0.55 + Math.random() * 1.1),
      vy: (Math.random() - 0.5) * 0.5,
      age: Math.random() * 120,
      life: 90 + Math.random() * 110,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of particles) {
        const nx = p.x * 0.005;
        const ny = p.y * 0.005;
        const curl = Math.sin(nx * 2.1 + 0.2) * Math.cos(ny * 1.8 + 0.3) * 0.45;
        p.x += p.vx + curl * 0.35;
        p.y += p.vy + curl * 0.2;
        p.age++;

        const t = p.age / p.life;
        const alpha = t < 0.15 ? t / 0.15 : t > 0.75 ? (1 - t) / 0.25 : 1;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 7, p.y - p.vy * 7);
        ctx.strokeStyle = `rgba(147,197,253,${alpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,197,253,${alpha * 0.85})`;
        ctx.fill();

        if (p.age >= p.life || p.x < -30 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
          p.x = W + Math.random() * 30;
          p.y = Math.random() * H;
          p.age = 0;
          p.life = 90 + Math.random() * 110;
        }
      }
      windAnimRef.current = requestAnimationFrame(draw);
    };
    windAnimRef.current = requestAnimationFrame(draw);
  }, []);

  const stopWindAnimation = useCallback(() => {
    cancelAnimationFrame(windAnimRef.current);
    const canvas = windCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { center: [44, 12], zoom: 6, zoomControl: true });

    // Custom pane so drones always render above aircraft
    const dronePane = map.createPane('dronePane');
    dronePane.style.zIndex = '615';

    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors', maxZoom: 18,
    }).addTo(map);

    const airspaceLayer = L.layerGroup().addTo(map);
    const flightLayer   = L.layerGroup().addTo(map);
    const droneLayer    = L.layerGroup().addTo(map);

    mapRef.current          = map;
    tileLayerRef.current    = tile;
    droneLayerRef.current   = droneLayer;
    flightLayerRef.current  = flightLayer;
    airspaceLayerRef.current = airspaceLayer;

    const emitBounds = () => {
      const b = map.getBounds();
      onBoundsChange?.({ latMin: b.getSouth(), lonMin: b.getWest(), latMax: b.getNorth(), lonMax: b.getEast() });
    };
    map.on('moveend', emitBounds);
    map.on('zoomend', emitBounds);
    emitBounds();

    return () => {
      cancelAnimationFrame(windAnimRef.current);
      if (windCanvasRef.current) { windCanvasRef.current.remove(); windCanvasRef.current = null; }
      map.remove();
      mapRef.current          = null;
      droneLayerRef.current   = null;
      flightLayerRef.current  = null;
      airspaceLayerRef.current = null;
      droneMarkersRef.current  = {};
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

  // Wind particle animation (independent of OWM key)
  useEffect(() => {
    if (layers.wind) startWindAnimation();
    else stopWindAnimation();
    return () => stopWindAnimation();
  }, [layers.wind, startWindAnimation, stopWindAnimation]);

  // Airspace circle overlays
  useEffect(() => {
    const layer = airspaceLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    AIRSPACE_ZONES.forEach(zone => {
      const key = `airspace${zone.class}` as keyof LayerVisibility;
      if (!(layers[key] as boolean)) return;

      L.circle([zone.lat, zone.lon], {
        radius: zone.radiusM,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.05,
        weight: zone.class === 'A' ? 1 : 1.5,
        opacity: zone.class === 'A' ? 0.4 : 0.7,
        dashArray: zone.class === 'A' ? '8 5' : zone.class === 'D' ? '4 4' : undefined,
        interactive: true,
      })
        .bindTooltip(`<b>Class ${zone.class}</b> &mdash; ${zone.name}`, { permanent: false, direction: 'center' })
        .addTo(layer);
    });
  }, [layers.airspaceA, layers.airspaceB, layers.airspaceC, layers.airspaceD]);

  // Drone markers — always in custom top pane
  const updateDroneMarkers = useCallback(() => {
    const layer = droneLayerRef.current;
    if (!layer) return;
    if (!layers.drones) { layer.clearLayers(); droneMarkersRef.current = {}; return; }

    const existing = droneMarkersRef.current;
    const seen = new Set<string>();

    Object.values(drones).forEach((d: TelemetryData) => {
      seen.add(d.drone_id);
      const selected = d.drone_id === selectedDroneId;
      const icon = droneIcon(selected, d.status);
      if (existing[d.drone_id]) {
        existing[d.drone_id].setLatLng([d.latitude, d.longitude]).setIcon(icon);
      } else {
        const marker = L.marker([d.latitude, d.longitude], { icon, pane: 'dronePane' })
          .bindTooltip(`${d.name ?? d.drone_id} · ${d.battery_percentage}% · ${Math.round(d.altitude)}m`, {
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
  useEffect(() => { updateFlightMarkers(); }, [updateFlightMarkers]);

  // Fly to selected drone
  useEffect(() => {
    if (selectedDroneId && drones[selectedDroneId] && mapRef.current) {
      const d = drones[selectedDroneId];
      mapRef.current.flyTo([d.latitude, d.longitude], 14, { duration: 1.2 });
    }
  }, [selectedDroneId]);

  return (
<div className="relative w-full h-full">
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
