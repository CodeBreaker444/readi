'use client';
import { LEAFLET_TILE_ATTRIBUTION, LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM, LEAFLET_TILE_DARK, LEAFLET_TILE_DARK_LABELS, LEAFLET_TILE_LIGHT, LEAFLET_TILE_LIGHT_LABELS, LEAFLET_TILE_MAX_ZOOM } from '@/lib/leaflet-tiles';
import { circleWithinRings } from '@/lib/geo';
import { Loader2, Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  /** The selected U-space's registered horizontal projection — D-Flight rejects a circle whose buffer falls outside this, so it's drawn on the map and used to validate. */
  boundary?: { lat: number; lng: number }[][] | null;
}

interface GeoResult {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
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

export default function DFlightCircleMap({ value, onChange, maxRadiusM, isDark = false, focusCenter = null, boundary = null }: DFlightCircleMapProps) {
  const mapId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const mapRef = useRef<any>(null);
  const drawnItemsRef = useRef<any>(null);
  const circleLayerRef = useRef<any>(null);
  const boundaryLayerRef = useRef<any>(null);
  const [reading, setReading] = useState<{ radiusM: number; areaM2: number; radiusOk: boolean; boundaryOk: boolean } | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const boundaryRef = useRef<{ lat: number; lng: number }[][] | null>(boundary);

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
    if (!mapReady || !focusCenter || circleLayerRef.current || (boundary && boundary.length > 0)) return;
    mapRef.current?.setView([focusCenter.lat, focusCenter.lng], FOCUS_ZOOM);
  }, [mapReady, focusCenter, boundary]);

  useEffect(() => {
    boundaryRef.current = boundary;
    if (!mapReady) return;
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    if (boundaryLayerRef.current) {
      mapRef.current.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }
    if (boundary && boundary.length > 0) {
      const group = L.layerGroup(
        boundary.map((ring) => L.polygon(ring.map((p) => [p.lat, p.lng]), {
          color: '#0ea5e9',
          weight: 2,
          dashArray: '6 4',
          fillColor: '#0ea5e9',
          fillOpacity: 0.08,
          interactive: false,
        })),
      ).addTo(mapRef.current);
      boundaryLayerRef.current = group;

      if (!circleLayerRef.current) {
        const allPoints = boundary.flat().map((p) => [p.lat, p.lng] as [number, number]);
        mapRef.current.fitBounds(allPoints, { padding: [20, 20], maxZoom: 15 });
      }
    }
  }, [boundary, mapReady]);

  // Re-validates any already-drawn circle whenever the boundary or the radius
  // cap changes — e.g. switching to a U-space with a tighter protection_buffers_horizontal.
  useEffect(() => {
    if (!mapReady || !circleLayerRef.current) return;
    const center = circleLayerRef.current.getLatLng();
    const radiusM = circleLayerRef.current.getRadius();
    const { radiusOk, boundaryOk, valid } = evaluateCircle(center.lat, center.lng, radiusM);
    const color = valid ? VALID_COLOR : INVALID_COLOR;
    circleLayerRef.current.setStyle({ color, fillColor: color });
    setReading({ radiusM, areaM2: Math.PI * radiusM * radiusM, radiusOk, boundaryOk });
    onChange(valid ? { lat: center.lat, lng: center.lng, radiusM } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary, maxRadiusM, mapReady]);

  useEffect(() => {
    if (query.trim().length < 3) { setResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const center = mapRef.current?.getCenter?.();
        const bias = center ? `&lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}` : '';
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}${bias}`);
        const data: GeoResult[] = await res.json();
        setResults(data);
        if (data.length > 0) {
          setDropdownRect(searchRef.current?.getBoundingClientRect() ?? null);
          setShowDropdown(true);
        }
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const selectResult = (r: GeoResult) => {
    const rlat = parseFloat(r.lat);
    const rlng = parseFloat(r.lon);
    setQuery(r.display_name.split(',').slice(0, 3).join(', ').trim());
    setShowDropdown(false);
    if (!mapRef.current) return;
    if (r.boundingbox) {
      const [minLat, maxLat, minLon, maxLon] = r.boundingbox.map(Number);
      mapRef.current.fitBounds([[minLat, minLon], [maxLat, maxLon]], { maxZoom: 16, padding: [20, 20] });
    } else {
      mapRef.current.setView([rlat, rlng], FOCUS_ZOOM);
    }
  };

  const clearSearch = () => { setQuery(''); setResults([]); setShowDropdown(false); };

  const evaluateCircle = (lat: number, lng: number, radiusM: number) => {
    const radiusOk = radiusM <= maxRadiusM;
    const rings = boundaryRef.current;
    const boundaryOk = !rings || rings.length === 0 || circleWithinRings({ lat, lng }, radiusM, rings);
    return { radiusOk, boundaryOk, valid: radiusOk && boundaryOk };
  };

  const applyCircle = (L: any, lat: number, lng: number, radiusM: number) => {
    const drawnItems = drawnItemsRef.current;
    if (!drawnItems) return;
    if (circleLayerRef.current) {
      drawnItems.removeLayer(circleLayerRef.current);
      circleLayerRef.current = null;
    }
    const { radiusOk, boundaryOk, valid } = evaluateCircle(lat, lng, radiusM);
    const color = valid ? VALID_COLOR : INVALID_COLOR;
    const layer = L.circle([lat, lng], { radius: radiusM, color, fillColor: color, fillOpacity: 0.2 });
    drawnItems.addLayer(layer);
    circleLayerRef.current = layer;
    setReading({ radiusM, areaM2: Math.PI * radiusM * radiusM, radiusOk, boundaryOk });
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
      const center = layer.getLatLng();
      const { radiusOk, boundaryOk, valid } = evaluateCircle(center.lat, center.lng, radiusM);
      const color = valid ? VALID_COLOR : INVALID_COLOR;
      layer.setStyle({ color, fillColor: color });
      setReading({ radiusM, areaM2: Math.PI * radiusM * radiusM, radiusOk, boundaryOk });
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

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const dropdownCls = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const resultItemCls = isDark
    ? 'text-slate-300 border-slate-700 hover:bg-slate-700'
    : 'text-gray-700 border-gray-100 hover:bg-violet-50';

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative flex items-center">
          {searching
            ? <Loader2 className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" />
            : <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />}
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) {
                setDropdownRect(searchRef.current?.getBoundingClientRect() ?? null);
                setShowDropdown(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            disabled={!mapReady}
            placeholder="Search for a location…"
            className={`w-full h-9 rounded-md border pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 disabled:opacity-50 ${inputCls}`}
          />
          {query && (
            <button type="button" onClick={clearSearch} className="cursor-pointer absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && dropdownRect && typeof document !== 'undefined' && createPortal(
          <div
            ref={dropdownRef}
            className={`pointer-events-auto fixed z-[99999] max-h-48 overflow-y-auto rounded-md border shadow-lg ${dropdownCls}`}
            style={{
              top: dropdownRect.bottom + window.scrollY + 4,
              left: dropdownRect.left + window.scrollX,
              width: dropdownRect.width,
            }}
          >
            {results.map(r => (
              <button
                key={r.place_id}
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); selectResult(r); }}
                className={`w-full border-b px-3 py-2 text-left text-xs last:border-0 ${resultItemCls}`}
              >
                {r.display_name}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>

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
              style={{ backgroundColor: reading.radiusOk && reading.boundaryOk ? VALID_COLOR : INVALID_COLOR }}
            />
            <span>
              <div>Radius: {Math.round(reading.radiusM)} m</div>
              <div>Area: {formatArea(reading.areaM2)}</div>
            </span>
          </div>
        )}
      </div>
      {reading && !reading.radiusOk && (
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          Radius exceeds the {maxRadiusM} m limit for this U-space. Edit or redraw the circle within the limit.
        </p>
      )}
      {reading && reading.radiusOk && !reading.boundaryOk && (
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          This circle falls outside the selected U-space&apos;s registered boundary (shown dashed on the map).
          Redraw it within the boundary so D-Flight will accept it.
        </p>
      )}
    </div>
  );
}
