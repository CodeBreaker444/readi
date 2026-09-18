'use client';
import { LEAFLET_TILE_ATTRIBUTION, LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM, LEAFLET_TILE_DARK, LEAFLET_TILE_DARK_LABELS, LEAFLET_TILE_LIGHT, LEAFLET_TILE_LIGHT_LABELS, LEAFLET_TILE_MAX_ZOOM } from '@/lib/leaflet-tiles';
import { useEffect, useId, useRef, useState } from 'react';

export interface DFlightCircle {
  lat: number;
  lng: number;
  radiusM: number;
}

interface DFlightCircleMapProps {
  value: DFlightCircle | null;
  onChange: (circle: DFlightCircle | null) => void;
  maxRadiusM: number;
  isDark?: boolean;
  focusCenter?: { lat: number; lng: number } | null;
}

const FOCUS_ZOOM = 12;

const ITALY_CENTER: [number, number] = [41.8719, 12.5674];
const ITALY_ZOOM = 6;

const VALID_COLOR = '#7c3aed';
const INVALID_COLOR = '#ef4444';

function formatArea(areaM2: number): string {
  if (areaM2 >= 1_000_000) return `${(areaM2 / 1_000_000).toFixed(3)} km²`;
  return `${Math.round(areaM2)} m²`;
}

export default function DFlightCircleMap({ value, onChange, maxRadiusM, isDark = false, focusCenter = null }: DFlightCircleMapProps) {
  const mapId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const circleLayerRef = useRef<any>(null);
  const [reading, setReading] = useState<{ radiusM: number; areaM2: number; valid: boolean } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    const drawCSS = document.createElement('link');
    drawCSS.rel = 'stylesheet';
    drawCSS.href = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css';
    document.head.appendChild(drawCSS);

    const initFromExisting = () => {
      const L = (window as any).L;
      if (!L || !mapRef.current || !drawnItemsRef.current || !value) return;
      applyCircle(L, value.lat, value.lng, value.radiusM);
    };

    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.async = true;

    leafletScript.onload = () => {
      const drawScript = document.createElement('script');
      drawScript.src = 'https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js';
      drawScript.async = true;
      drawScript.onload = () => {
        initMap();
        initFromExisting();
        setMapReady(true);
      };
      document.body.appendChild(drawScript);
    };

    document.body.appendChild(leafletScript);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !focusCenter || circleLayerRef.current) return;
    mapRef.current?.setView([focusCenter.lat, focusCenter.lng], FOCUS_ZOOM);
  }, [mapReady, focusCenter]);

  const applyCircle = (L: any, lat: number, lng: number, radiusM: number) => {
    const drawnItems = drawnItemsRef.current;
    if (!drawnItems) return;
    if (circleLayerRef.current) {
      drawnItems.removeLayer(circleLayerRef.current);
      circleLayerRef.current = null;
    }
    const valid = radiusM <= maxRadiusM;
    const color = valid ? VALID_COLOR : INVALID_COLOR;
    const layer = L.circle([lat, lng], { radius: radiusM, color, fillColor: color, fillOpacity: 0.2 });
    drawnItems.addLayer(layer);
    circleLayerRef.current = layer;
    setReading({ radiusM, areaM2: Math.PI * radiusM * radiusM, valid });
    mapRef.current?.setView([lat, lng], Math.max(mapRef.current.getZoom(), 12));
  };

  const initMap = () => {
    const L = (window as any).L;
    if (!L || mapRef.current) return;

    const map = L.map(mapId).setView(ITALY_CENTER, ITALY_ZOOM);

    L.tileLayer(isDark ? LEAFLET_TILE_DARK : LEAFLET_TILE_LIGHT, {
      attribution: LEAFLET_TILE_ATTRIBUTION,
      maxZoom: LEAFLET_TILE_MAX_ZOOM,
      maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
    }).addTo(map);

    L.tileLayer(isDark ? LEAFLET_TILE_DARK_LABELS : LEAFLET_TILE_LIGHT_LABELS, {
      maxZoom: LEAFLET_TILE_MAX_ZOOM,
      maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems, edit: true, remove: true },
      draw: {
        circle: { metric: true, shapeOptions: { color: VALID_COLOR, fillColor: VALID_COLOR } },
        polygon: false,
        rectangle: false,
        polyline: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);

    const reportCircle = (layer: any) => {
      const radiusM = layer.getRadius();
      const valid = radiusM <= maxRadiusM;
      const color = valid ? VALID_COLOR : INVALID_COLOR;
      layer.setStyle({ color, fillColor: color });
      setReading({ radiusM, areaM2: Math.PI * radiusM * radiusM, valid });
      const center = layer.getLatLng();
      onChange(valid ? { lat: center.lat, lng: center.lng, radiusM } : null);
    };

    map.on(L.Draw.Event.CREATED, (e: any) => {
      // Only one geofence circle is allowed per mission.
      if (circleLayerRef.current) {
        drawnItems.removeLayer(circleLayerRef.current);
        circleLayerRef.current = null;
      }
      const layer = e.layer;
      drawnItems.addLayer(layer);
      circleLayerRef.current = layer;
      reportCircle(layer);
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      e.layers.eachLayer((layer: any) => reportCircle(layer));
    });

    map.on(L.Draw.Event.DELETED, () => {
      circleLayerRef.current = null;
      setReading(null);
      onChange(null);
    });

    mapRef.current = map;
  };

  return (
    <div className="space-y-2">
      <div className={`relative rounded-xl overflow-hidden border ${isDark ? 'border-gray-700/60' : 'border-gray-200'}`}>
        <div id={mapId} style={{ height: '360px', width: '100%' }} />
        {reading && (
          <div
            className={`absolute top-2 right-2 z-[1000] rounded-md border px-2.5 py-1.5 text-xs shadow-sm flex items-center gap-1.5 ${
              isDark ? 'bg-slate-800/90 border-slate-600 text-slate-200' : 'bg-white/90 border-slate-200 text-slate-700'
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: reading.valid ? VALID_COLOR : INVALID_COLOR }}
            />
            <span>
              <div>Radius: {Math.round(reading.radiusM)} m</div>
              <div>Area: {formatArea(reading.areaM2)}</div>
            </span>
          </div>
        )}
      </div>
      {reading && !reading.valid && (
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Radius exceeds the {maxRadiusM} m limit for this mission type. Edit or redraw the circle within the limit.
        </p>
      )}
    </div>
  );
}
