'use client';

import {
  LEAFLET_TILE_ATTRIBUTION,
  LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
  LEAFLET_TILE_DARK,
  LEAFLET_TILE_DARK_LABELS,
  LEAFLET_TILE_LIGHT,
  LEAFLET_TILE_LIGHT_LABELS,
} from '@/lib/leaflet-tiles';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

export interface EventLocationMapProps {
  lat: number;
  lng: number;
  /** Mission plan outline, highlighted when present. */
  area?: { lat: number; lng: number }[] | null;
  isDark?: boolean;
  height?: number;
}

const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 24 12 24s12-15.75 12-24C24 5.373 18.627 0 12 0z" fill="#8b5cf6"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [24, 36],
  iconAnchor: [12, 36],
});

const AREA_STYLE: L.PathOptions = { color: '#f59e0b', weight: 2, fillColor: '#f59e0b', fillOpacity: 0.18, interactive: false };

/** Read-only map showing where an event happened (and the mission plan area, if any). */
export default function EventLocationMapInner({ lat, lng, area = null, isDark = false, height = 260 }: EventLocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { center: [lat, lng], zoom: 15, zoomControl: true });
    L.tileLayer(isDark ? LEAFLET_TILE_DARK : LEAFLET_TILE_LIGHT, {
      attribution: LEAFLET_TILE_ATTRIBUTION,
      maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
    }).addTo(map);
    L.tileLayer(isDark ? LEAFLET_TILE_DARK_LABELS : LEAFLET_TILE_LIGHT_LABELS, {
      maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
    }).addTo(map);

    const marker = L.marker([lat, lng], { icon: PIN_ICON }).addTo(map);
    if (area && area.length >= 2) {
      const pts = area.map((p) => [p.lat, p.lng] as [number, number]);
      const layer = (pts.length >= 3 ? L.polygon(pts, AREA_STYLE) : L.polyline(pts, AREA_STYLE)).addTo(map);
      // Show the plan and the event together.
      map.fitBounds(layer.getBounds().extend(marker.getLatLng()), { padding: [24, 24], maxZoom: 17 });
    }

    // The map is created inside a dialog that is still animating open.
    const resize = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(resize);
      map.remove();
    };
  }, [lat, lng, isDark, JSON.stringify(area)]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg"
      style={{ height, border: isDark ? '1px solid #334155' : '1px solid #e5e7eb' }}
    />
  );
}
