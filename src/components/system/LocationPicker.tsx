'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface LocationPickerProps {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string, label?: string) => void;
  isDark?: boolean;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
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

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DEFAULT_CENTER: [number, number] = [41.9, 12.5];
const DEFAULT_ZOOM = 4;

function isValidLat(v: string) { const n = Number(v); return v !== '' && !isNaN(n) && n >= -90  && n <= 90; }
function isValidLng(v: string) { const n = Number(v); return v !== '' && !isNaN(n) && n >= -180 && n <= 180; }

export default function LocationPicker({ lat, lng, onChange, isDark = false }: LocationPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  const markerRef    = useRef<L.Marker | null>(null);
  const tileRef      = useRef<L.TileLayer | null>(null);
  const searchRef    = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const [query, setQuery]               = useState('');
  const [results, setResults]           = useState<NominatimResult[]>([]);
  const [searching, setSearching]       = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating]         = useState(false);

  // Local draft values for the direct-input fields so typing is smooth
  const [draftLat, setDraftLat] = useState(lat);
  const [draftLng, setDraftLng] = useState(lng);

  // Keep drafts in sync when parent resets or geocoder sets values
  useEffect(() => { setDraftLat(lat); }, [lat]);
  useEffect(() => { setDraftLng(lng); }, [lng]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const placeOrMoveMarker = (map: L.Map, clat: number, clng: number) => {
    if (markerRef.current) {
      markerRef.current.setLatLng([clat, clng]);
    } else {
      const m = L.marker([clat, clng], { draggable: true, icon: PIN_ICON }).addTo(map);
      m.on('dragend', () => {
        const p = m.getLatLng();
        onChange(p.lat.toFixed(6), p.lng.toFixed(6));
      });
      markerRef.current = m;
    }
  };

  // ── init map once ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasCoords = lat && lng;
    const center: [number, number] = hasCoords ? [Number(lat), Number(lng)] : DEFAULT_CENTER;
    const zoom = hasCoords ? 13 : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, { center, zoom, zoomControl: true });
    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    tileRef.current = tile;

    if (hasCoords) {
      placeOrMoveMarker(map, Number(lat), Number(lng));
    }

    map.on('click', (e) => {
      placeOrMoveMarker(map, e.latlng.lat, e.latlng.lng);
      onChange(e.latlng.lat.toFixed(6), e.latlng.lng.toFixed(6));
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── tile swap on theme change ──────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return;
    tileRef.current.remove();
    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);
    tileRef.current = tile;
  }, [isDark]);

  // ── sync external lat/lng into map ────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current) return;
    if (lat && lng) {
      const pos: [number, number] = [Number(lat), Number(lng)];
      placeOrMoveMarker(mapRef.current, pos[0], pos[1]);
      mapRef.current.setView(pos, mapRef.current.getZoom() < 10 ? 13 : mapRef.current.getZoom());
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // ── address search (Nominatim) ─────────────────────────────────────────────

  useEffect(() => {
    if (query.length < 3) { setResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data: NominatimResult[] = await res.json();
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

  const selectResult = (r: NominatimResult) => {
    const rlat = parseFloat(r.lat);
    const rlng = parseFloat(r.lon);
    const shortLabel = r.display_name.split(',').slice(0, 3).join(', ').trim();
    setQuery(shortLabel);
    setShowDropdown(false);
    if (mapRef.current) {
      mapRef.current.setView([rlat, rlng], 14);
      placeOrMoveMarker(mapRef.current, rlat, rlng);
    }
    onChange(r.lat, r.lon, shortLabel);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: mlat, longitude: mlng } = pos.coords;
        if (mapRef.current) {
          mapRef.current.setView([mlat, mlng], 15);
          placeOrMoveMarker(mapRef.current, mlat, mlng);
        }
        onChange(mlat.toFixed(6), mlng.toFixed(6));
        setLocating(false);
      },
      () => { setLocating(false); },
    );
  };

  const clearAll = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    onChange('', '', '');
  };

  // ── direct coord input handlers ───────────────────────────────────────────

  const handleLatBlur = () => {
    if (isValidLat(draftLat) && isValidLng(draftLng || lng)) {
      onChange(draftLat, draftLng || lng);
    } else if (!draftLat) {
      onChange('', '');
    }
  };

  const handleLngBlur = () => {
    if (isValidLat(draftLat || lat) && isValidLng(draftLng)) {
      onChange(draftLat || lat, draftLng);
    } else if (!draftLng) {
      onChange('', '');
    }
  };

  // ── styles ─────────────────────────────────────────────────────────────────

  const inputCls = isDark
    ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder:text-slate-500'
    : 'bg-gray-50 border-gray-200 text-gray-900';
  const coordInputCls = `h-8 w-full rounded-md border px-2 text-xs tabular-nums outline-none focus:ring-2 focus:ring-violet-500/30 ${inputCls}`;
  const labelCls = `text-[10px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const dropdownCls = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const resultItemCls = isDark
    ? 'text-slate-300 border-slate-700 hover:bg-slate-700'
    : 'text-gray-700 border-gray-100 hover:bg-violet-50';

  return (
    <div className="space-y-2">

      {/* Address search */}
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
            placeholder={t('systems.components.common.locationSearchPlaceholder')}
            className={`w-full h-9 rounded-md border pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 ${inputCls}`}
          />
          {(query || lat) && (
            <button type="button" onClick={clearAll} className="absolute right-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {showDropdown && results.length > 0 && dropdownRect && typeof document !== 'undefined' && createPortal(
          <div
            className={`fixed z-9999 max-h-48 overflow-y-auto rounded-md border shadow-lg ${dropdownCls}`}
            style={{
              top:  dropdownRect.bottom + window.scrollY + 4,
              left: dropdownRect.left   + window.scrollX,
              width: dropdownRect.width,
            }}
          >
            {results.map(r => (
              <button
                key={r.place_id}
                type="button"
                onMouseDown={() => selectResult(r)}
                className={`w-full border-b px-3 py-2 text-left text-xs last:border-0 ${resultItemCls}`}
              >
                {r.display_name}
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height: 220, border: isDark ? '1px solid #334155' : '1px solid #e5e7eb' }}
      />

      {/* Use my location */}
      <button
        type="button"
        onClick={handleUseMyLocation}
        disabled={locating}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
          isDark
            ? 'border-slate-600 text-slate-300 hover:border-violet-400 hover:text-violet-300 bg-slate-700'
            : 'border-slate-300 text-slate-600 hover:border-violet-400 hover:text-violet-600 bg-white'
        }`}
      >
        {locating
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <LocateFixed className="h-3.5 w-3.5" />}
        Use my location
      </button>

      {/* Direct coordinate inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={labelCls}>Latitude</p>
          <input
            type="number"
            step="any"
            min={-90}
            max={90}
            value={draftLat}
            onChange={e => setDraftLat(e.target.value)}
            onBlur={handleLatBlur}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="e.g. 41.902782"
            className={coordInputCls}
          />
        </div>
        <div>
          <p className={labelCls}>Longitude</p>
          <input
            type="number"
            step="any"
            min={-180}
            max={180}
            value={draftLng}
            onChange={e => setDraftLng(e.target.value)}
            onBlur={handleLngBlur}
            onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            placeholder="e.g. 12.496366"
            className={coordInputCls}
          />
        </div>
      </div>

    </div>
  );
}
