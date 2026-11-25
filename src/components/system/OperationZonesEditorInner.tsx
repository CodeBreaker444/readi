'use client';

import {
  LEAFLET_TILE_ATTRIBUTION,
  LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM,
  LEAFLET_TILE_DARK,
  LEAFLET_TILE_DARK_LABELS,
  LEAFLET_TILE_LIGHT,
  LEAFLET_TILE_LIGHT_LABELS,
  LEAFLET_TILE_MAX_ZOOM,
  LEAFLET_TILE_SATELLITE,
  LEAFLET_TILE_SATELLITE_ATTRIBUTION,
  LEAFLET_TILE_SATELLITE_LABELS,
} from '@/lib/leaflet-tiles';
import {
  boundsOf,
  KIND_LABEL,
  LatLngTuple,
  MAX_TOTAL_POINTS,
  minPointsFor,
  MAX_ZONES,
  countPoints,
  newZoneId,
  nextZoneName,
  OperationZone,
  OperationZones,
  parseKmlOrKmzFile,
  PERIMETER_COLOR,
  ZONE_COLORS,
  ZoneKind,
  ZoneShape,
} from '@/lib/operation-zones';
import { renderZoneLayers } from '@/lib/operation-zones-leaflet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, Eraser, Fence, Layers, Maximize2, MapPin, Pentagon, Route, Trash2, Undo2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface OperationZonesEditorProps {
  value: OperationZones;
  onChange: (value: OperationZones) => void;
  isDark?: boolean;
  /** Where to centre the map while there are no zones yet (the system's base). */
  focus?: { lat: number; lng: number } | null;
  height?: number;
}

type DrawMode = { type: 'zone'; shape: ZoneShape } | { type: 'perimeter' } | null;
type Basemap = 'satellite' | 'map';

const PIN_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="26" height="39" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 24 12 24s12-15.75 12-24C24 5.373 18.627 0 12 0z" fill="#8b5cf6" stroke="#fff" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`,
  className: '',
  iconSize: [26, 39],
  iconAnchor: [13, 39],
});

const DEFAULT_CENTER: [number, number] = [41.9, 12.5];
const KINDS: ZoneKind[] = ['green', 'red', 'unsurveyed'];

/** Icon badge showing a zone's shape (area / line / pin), tinted with the zone's colour. */
function ShapeBadge({ shape, color, label }: { shape: ZoneShape | 'perimeter'; color: string; label: string }) {
  const Icon = shape === 'line' ? Route : shape === 'point' ? MapPin : shape === 'perimeter' ? Fence : Pentagon;
  return (
    <span title={label} aria-label={label} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border"
      style={{ color, background: `${color}22`, borderColor: `${color}66` }}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

export default function OperationZonesEditorInner({ value, onChange, isDark = false, focus = null, height = 460 }: OperationZonesEditorProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.TileLayer[]>([]);
  const zoneGroupRef = useRef<L.LayerGroup | null>(null);
  const draftGroupRef = useRef<L.LayerGroup | null>(null);
  const vertexGroupRef = useRef<L.LayerGroup | null>(null);
  const rubberRef = useRef<L.Polyline | null>(null);
  const locationMarkerRef = useRef<L.Marker | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [basemap, setBasemap] = useState<Basemap>('satellite');
  const [mode, setMode] = useState<DrawMode>(null);
  const [kind, setKind] = useState<ZoneKind>('green');
  const [draft, setDraft] = useState<LatLngTuple[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Map event handlers are bound once, so they read the latest state through refs.
  const modeRef = useRef(mode);
  const draftRef = useRef(draft);
  const valueRef = useRef(value);
  const kindRef = useRef(kind);
  modeRef.current = mode;
  draftRef.current = draft;
  valueRef.current = value;
  kindRef.current = kind;

  const minPoints = mode?.type === 'zone' ? minPointsFor(mode.shape) : 3;

  // ── Map init ──
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const zones = valueRef.current;
    const b = boundsOf(zones);
    const map = L.map(containerRef.current, {
      center: focus ? [focus.lat, focus.lng] : DEFAULT_CENTER,
      zoom: focus ? 16 : 4,
      maxZoom: LEAFLET_TILE_MAX_ZOOM,
      zoomControl: true,
    });
    zoneGroupRef.current = L.layerGroup().addTo(map);
    vertexGroupRef.current = L.layerGroup().addTo(map);
    draftGroupRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!modeRef.current) return;
      const { lat, lng } = e.latlng.wrap();
      const p: LatLngTuple = [Number(lat.toFixed(6)), Number(lng.toFixed(6))];
      const m = modeRef.current;
      if (m.type === 'zone' && m.shape === 'point') { addPinRef.current(p); return; }
      // A double-click fires two clicks on the same spot; keep one point.
      setDraft((prev) => (prev.length && prev[prev.length - 1][0] === p[0] && prev[prev.length - 1][1] === p[1] ? prev : [...prev, p]));
    });
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const pts = draftRef.current;
      if (!modeRef.current || pts.length === 0) return;
      const last = pts[pts.length - 1];
      if (!rubberRef.current) {
        rubberRef.current = L.polyline([last, e.latlng], { color: '#fff', weight: 2, dashArray: '4 4', interactive: false }).addTo(draftGroupRef.current!);
      } else {
        rubberRef.current.setLatLngs([last, e.latlng]);
      }
    });

    mapRef.current = map;
    if (b) map.fitBounds(focus ? [[Math.min(b[0][0], focus.lat), Math.min(b[0][1], focus.lng)], [Math.max(b[1][0], focus.lat), Math.max(b[1][1], focus.lng)]] : b, { padding: [24, 24], maxZoom: 18 });
    // The editor usually mounts inside an animating dialog/tab.
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => { clearTimeout(timer); map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── System location pin ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    locationMarkerRef.current?.remove();
    locationMarkerRef.current = null;
    if (!focus || !Number.isFinite(focus.lat) || !Number.isFinite(focus.lng)) return;
    locationMarkerRef.current = L.marker([focus.lat, focus.lng], { icon: PIN_ICON, interactive: true, keyboard: false, bubblingMouseEvents: true, zIndexOffset: 1000 })
      .bindTooltip(t('systems.zones.systemLocation', 'System location'), { direction: 'top', offset: [0, -36] })
      .addTo(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lat, focus?.lng]);

  // ── Basemap (satellite by default) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    baseRef.current.forEach((l) => l.remove());
    const layers: L.TileLayer[] = basemap === 'satellite'
      ? [
          L.tileLayer(LEAFLET_TILE_SATELLITE, { attribution: LEAFLET_TILE_SATELLITE_ATTRIBUTION, maxZoom: LEAFLET_TILE_MAX_ZOOM, maxNativeZoom: 19 }),
          L.tileLayer(LEAFLET_TILE_SATELLITE_LABELS, { maxZoom: LEAFLET_TILE_MAX_ZOOM, maxNativeZoom: 19 }),
        ]
      : [
          L.tileLayer(isDark ? LEAFLET_TILE_DARK : LEAFLET_TILE_LIGHT, { attribution: LEAFLET_TILE_ATTRIBUTION, maxZoom: LEAFLET_TILE_MAX_ZOOM, maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM }),
          L.tileLayer(isDark ? LEAFLET_TILE_DARK_LABELS : LEAFLET_TILE_LIGHT_LABELS, { maxZoom: LEAFLET_TILE_MAX_ZOOM, maxNativeZoom: LEAFLET_TILE_BASE_MAX_NATIVE_ZOOM }),
        ];
    layers.forEach((l) => { l.addTo(map); l.bringToBack(); });
    baseRef.current = layers;
  }, [basemap, isDark]);

  // ── Saved zones ──
  useEffect(() => {
    const group = zoneGroupRef.current;
    if (!group) return;
    renderZoneLayers(L, group, value, {
      interactive: !mode,
      selectedId,
      onSelect: (id) => setSelectedId(id),
    });
  }, [value, selectedId, mode]);

  // ── Vertex handles for the selected zone ──
  useEffect(() => {
    const group = vertexGroupRef.current;
    if (!group) return;
    group.clearLayers();
    if (mode || !selectedId) return;
    const isPerimeter = selectedId === 'perimeter';
    const zone = isPerimeter ? null : value.zones.find((z) => z.id === selectedId);
    const pts = isPerimeter ? value.perimeter?.points : zone?.points;
    if (!pts) return;
    const color = isPerimeter ? PERIMETER_COLOR : ZONE_COLORS[zone!.kind];
    const min = isPerimeter ? 3 : minPointsFor(zone!.shape);

    pts.forEach((p, i) => {
      const m = L.marker(p, {
        draggable: true,
        icon: L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:#fff;border:3px solid ${color};box-shadow:0 0 2px #000"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
      });
      const apply = (next: LatLngTuple[]) => {
        const v = valueRef.current;
        if (isPerimeter) onChange({ ...v, perimeter: v.perimeter ? { ...v.perimeter, points: next } : null });
        else onChange({ ...v, zones: v.zones.map((z) => (z.id === selectedId ? { ...z, points: next } : z)) });
      };
      m.on('dragend', () => {
        const ll = m.getLatLng().wrap();
        apply(pts.map((q, j) => (j === i ? [Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6))] as LatLngTuple : q)));
      });
      m.on('contextmenu', () => { if (pts.length > min) apply(pts.filter((_, j) => j !== i)); });
      m.bindTooltip(t('systems.zones.vertexHint', 'Drag to move · right-click to remove'), { direction: 'top', offset: [0, -8] });
      m.addTo(group);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedId, mode]);

  // ── Draft shape while drawing ──
  useEffect(() => {
    const group = draftGroupRef.current;
    if (!group) return;
    group.clearLayers();
    rubberRef.current = null;
    if (!mode || draft.length === 0) return;
    const color = mode.type === 'perimeter' ? PERIMETER_COLOR : ZONE_COLORS[kind];
    const style: L.PathOptions = { color, weight: 3, fillColor: color, fillOpacity: 0.2, interactive: false, dashArray: mode.type === 'perimeter' ? '10 6' : undefined };
    const closed = mode.type === 'perimeter' || mode.shape === 'polygon';
    (closed && draft.length >= 3 ? L.polygon(draft, style) : L.polyline(draft, style)).addTo(group);
    draft.forEach((p) => L.circleMarker(p, { radius: 5, color, fillColor: '#fff', fillOpacity: 1, weight: 2, interactive: false }).addTo(group));
  }, [draft, mode, kind]);

  // Crosshair + no double-click zoom while drawing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getContainer().style.cursor = mode ? 'crosshair' : '';
    if (mode) map.doubleClickZoom.disable(); else map.doubleClickZoom.enable();
  }, [mode]);

  const startDraw = (next: DrawMode) => {
    setSelectedId(null);
    setDraft([]);
    setMode(next);
  };
  const cancelDraw = () => { setMode(null); setDraft([]); };

  const finishDraw = () => {
    if (!mode || draft.length < minPoints) return;
    if (mode.type === 'perimeter') {
      if (value.perimeter) toast.info(t('systems.zones.perimeterReplaced', 'Previous perimeter replaced (a system has one perimeter)'));
      onChange({ ...value, perimeter: { name: value.perimeter?.name || t('systems.zones.perimeter', 'Operational perimeter'), points: draft } });
      setSelectedId('perimeter');
    } else {
      if (value.zones.length >= MAX_ZONES) { toast.error(t('systems.zones.tooMany', 'Too many zones')); return; }
      const zone: OperationZone = { id: newZoneId(), name: nextZoneName(value.zones, kind), kind, shape: mode.shape, points: draft };
      onChange({ ...value, zones: [...value.zones, zone] });
      setSelectedId(zone.id);
    }
    cancelDraw();
  };

  // Enter finishes, Escape cancels. Captured on window so Escape doesn't also close the surrounding dialog.
  const addPin = (p: LatLngTuple) => {
    const v = valueRef.current;
    if (v.zones.length >= MAX_ZONES) { toast.error(t('systems.zones.tooMany', 'Too many zones')); return; }
    const zone: OperationZone = { id: newZoneId(), name: nextZoneName(v.zones, kindRef.current), kind: kindRef.current, shape: 'point', points: [p] };
    onChange({ ...v, zones: [...v.zones, zone] });
    setSelectedId(zone.id);
    setMode(null);
    setDraft([]);
  };
  const addPinRef = useRef(addPin);
  addPinRef.current = addPin;

  const finishRef = useRef(finishDraw);
  finishRef.current = finishDraw;
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setMode(null); setDraft([]); }
      else if (e.key === 'Enter' && tag !== 'INPUT' && tag !== 'SELECT') { e.preventDefault(); finishRef.current(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [mode]);

  // Two-step clear: the first click arms the button for a few seconds, the second one clears everything.
  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const clearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    setConfirmClear(false);
    cancelDraw();
    setSelectedId(null);
    onChange({ zones: [], perimeter: null });
    toast.success(t('systems.zones.cleared', 'All zones cleared'));
  };

  const fitAll = () => {
    const b = boundsOf(value);
    if (b && mapRef.current) mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 18 });
  };

  const focusItem = (id: string) => {
    setSelectedId(id);
    const pts = id === 'perimeter' ? value.perimeter?.points : value.zones.find((z) => z.id === id)?.points;
    if (pts && mapRef.current) mapRef.current.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 18 });
  };

  const patchZone = (id: string, patch: Partial<OperationZone>) =>
    onChange({ ...value, zones: value.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)) });

  const removeItem = (id: string) => {
    if (id === 'perimeter') onChange({ ...value, perimeter: null });
    else onChange({ ...value, zones: value.zones.filter((z) => z.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const res = await parseKmlOrKmzFile(file);
      if (res.zones.length === 0 && !res.perimeter) {
        toast.error(t('systems.zones.importEmpty', 'No lines or polygons found in this file'));
        return;
      }
      const room = Math.max(0, MAX_ZONES - value.zones.length);
      let budget = MAX_TOTAL_POINTS - countPoints(value) - (res.perimeter?.points.length ?? 0);
      const zones: OperationZone[] = [];
      for (const z of res.zones.slice(0, room)) {
        if (budget < z.points.length) break;
        budget -= z.points.length;
        zones.push(z);
      }
      const next: OperationZones = {
        zones: [...value.zones, ...zones],
        perimeter: res.perimeter ?? value.perimeter,
      };
      onChange(next);
      const b = boundsOf({ zones, perimeter: res.perimeter });
      if (b && mapRef.current) mapRef.current.fitBounds(b, { padding: [24, 24], maxZoom: 18 });
      toast.success(
        t('systems.zones.importDone', '{{count}} zones imported', { count: zones.length }) +
        (res.perimeter ? t('systems.zones.importPerimeter', ' + perimeter') : '') +
        (res.skipped ? ` · ${t('systems.zones.importSkipped', '{{count}} skipped (no line/polygon)', { count: res.skipped })}` : ''),
      );
      if (zones.length < res.zones.length) toast.warning(t('systems.zones.tooMany', 'Too many zones') + ` (max ${MAX_ZONES})`);
    } catch (err) {
      toast.error(t('systems.zones.importFailed', 'Could not read this KML/KMZ file') + (err instanceof Error && err.message ? `: ${err.message}` : ''));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const border = isDark ? 'border-slate-700' : 'border-gray-200';
  const btn = `inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
    isDark ? 'border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
  }`;
  const btnOn = 'border-violet-500! bg-violet-600! text-white!';
  const stopEnter = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } };
  const fieldCls = `h-7 rounded border px-2 text-xs outline-none focus:ring-2 focus:ring-violet-500/30 ${
    isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-gray-50 border-gray-200 text-gray-900'
  }`;
  const muted = isDark ? 'text-slate-400' : 'text-gray-500';

  const drawing = mode !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" title={t('systems.zones.drawPolygon', 'Draw polygon zone')} aria-label={t('systems.zones.drawPolygon', 'Draw polygon zone')}
          className={`${btn} ${mode?.type === 'zone' && mode.shape === 'polygon' ? btnOn : ''}`} onClick={() => startDraw({ type: 'zone', shape: 'polygon' })}>
          <Pentagon className="h-4 w-4" />
        </button>
        <button type="button" title={t('systems.zones.drawLine', 'Draw line zone')} aria-label={t('systems.zones.drawLine', 'Draw line zone')}
          className={`${btn} ${mode?.type === 'zone' && mode.shape === 'line' ? btnOn : ''}`} onClick={() => startDraw({ type: 'zone', shape: 'line' })}>
          <Route className="h-4 w-4" />
        </button>
        <button type="button" title={t('systems.zones.drawPin', 'Add pin')} aria-label={t('systems.zones.drawPin', 'Add pin')}
          className={`${btn} ${mode?.type === 'zone' && mode.shape === 'point' ? btnOn : ''}`} onClick={() => startDraw({ type: 'zone', shape: 'point' })}>
          <MapPin className="h-4 w-4" />
        </button>
        <button type="button" title={t('systems.zones.drawPerimeter', 'Draw operational perimeter')} aria-label={t('systems.zones.drawPerimeter', 'Draw operational perimeter')}
          className={`${btn} ${mode?.type === 'perimeter' ? btnOn : ''}`} onClick={() => startDraw({ type: 'perimeter' })}>
          <Fence className="h-4 w-4" />
        </button>

        <span className={`mx-1 h-5 w-px ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />

        {KINDS.map((k) => (
          <button key={k} type="button" title={KIND_LABEL[k]} aria-label={KIND_LABEL[k]} aria-pressed={kind === k}
            onClick={() => { setKind(k); if (selectedId && selectedId !== 'perimeter' && !drawing) patchZone(selectedId, { kind: k }); }}
            className={`h-6 w-6 cursor-pointer rounded-full border-2 transition-transform ${kind === k ? 'scale-110 ring-2 ring-violet-500 ring-offset-1' : 'opacity-70 hover:opacity-100'} ${isDark ? 'ring-offset-slate-800 border-slate-800' : 'border-white'}`}
            style={{ background: ZONE_COLORS[k] }} />
        ))}

        <span className={`mx-1 h-5 w-px ${isDark ? 'bg-slate-600' : 'bg-gray-300'}`} />

        <button type="button" className={btn} disabled={!drawing || draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}
          title={t('systems.zones.undoPoint', 'Undo last point')} aria-label={t('systems.zones.undoPoint', 'Undo last point')}>
          <Undo2 className="h-4 w-4" />
        </button>
        <button type="button" className={`${btn} ${drawing && draft.length >= minPoints ? 'border-green-500! text-green-500!' : ''}`} disabled={!drawing || draft.length < minPoints} onClick={finishDraw}
          title={t('systems.zones.finish', 'Finish shape (Enter)')} aria-label={t('systems.zones.finish', 'Finish shape (Enter)')}>
          <Check className="h-4 w-4" />
        </button>
        <button type="button" className={btn} disabled={!drawing} onClick={cancelDraw}
          title={t('systems.zones.cancel', 'Cancel drawing (Esc)')} aria-label={t('systems.zones.cancel', 'Cancel drawing (Esc)')}>
          <X className="h-4 w-4" />
        </button>

        <span className="flex-1" />

        <button type="button" disabled={value.zones.length === 0 && !value.perimeter} onClick={clearAll}
          title={t('systems.zones.clearAll', 'Clear all zones from the map')}
          className={`${btn} w-auto gap-1.5 px-2.5 ${confirmClear ? 'border-red-500! bg-red-600! text-white! hover:bg-red-500!' : 'text-red-500!'}`}>
          <Eraser className="h-4 w-4" />
          <span>{confirmClear ? t('systems.zones.clearConfirm', 'Click again to confirm') : t('systems.zones.clear', 'Clear all')}</span>
        </button>
        <input ref={fileRef} type="file" accept=".kmz,.kml" className="hidden" onChange={(e) => handleImport(e.target.files?.[0])} />
        <button type="button" className={`${btn} w-auto gap-1.5 px-2.5`} onClick={() => fileRef.current?.click()}
          title={t('systems.zones.importTitle', 'Import zones from a KMZ/KML file')}>
          <Upload className="h-4 w-4" />
          <span>{t('systems.zones.import', 'Import KMZ')}</span>
        </button>
        <button type="button" className={btn} onClick={fitAll} disabled={!boundsOf(value)}
          title={t('systems.zones.fit', 'Zoom to all zones')} aria-label={t('systems.zones.fit', 'Zoom to all zones')}>
          <Maximize2 className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => setBasemap((b) => (b === 'satellite' ? 'map' : 'satellite'))}
          title={basemap === 'satellite' ? t('systems.zones.showMap', 'Switch to street map') : t('systems.zones.showSatellite', 'Switch to satellite')}
          aria-label={t('systems.zones.toggleBasemap', 'Toggle basemap')}>
          <Layers className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full overflow-hidden rounded-lg border" style={{ height, borderColor: isDark ? '#334155' : '#e5e7eb' }} />
        {drawing && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center">
            <span className={`rounded-full px-3 py-1 text-xs font-medium shadow ${isDark ? 'bg-slate-900/85 text-slate-100' : 'bg-white/95 text-slate-700'}`}>
              {t('systems.zones.drawingHint', 'Click the map to add points · {{n}} placed · Enter to finish, Esc to cancel', { n: draft.length })}
              {mode?.type === 'perimeter' && value.perimeter && ` · ${t('systems.zones.replacesPerimeter', 'replaces the existing perimeter')}`}
            </span>
          </div>
        )}
      </div>

      <div className={`h-44 overflow-y-auto rounded-lg border ${border}`}>
        {!value.perimeter && value.zones.length === 0 ? (
          <p className={`flex h-full items-center justify-center px-3 text-center text-xs ${muted}`}>
            {t('systems.zones.empty', 'No zones yet. Draw on the map or import a KMZ/KML file. Everything here is optional.')}
          </p>
        ) : (
          <ul className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
            {value.perimeter && (
              <li className={`flex items-center gap-2 px-3 py-1.5 ${selectedId === 'perimeter' ? (isDark ? 'bg-slate-700/60' : 'bg-violet-50') : ''}`}>
                <ShapeBadge shape="perimeter" color={PERIMETER_COLOR} label={t('systems.zones.perimeterTag', 'Perimeter')} />
                <input className={`${fieldCls} min-w-0 flex-1`} value={value.perimeter.name} onKeyDown={stopEnter}
                  onFocus={() => focusItem('perimeter')}
                  onChange={(e) => onChange({ ...value, perimeter: { ...value.perimeter!, name: e.target.value } })} />
                <span className={`w-36 shrink-0 px-2 text-xs ${muted}`}>{t('systems.zones.perimeterTag', 'Perimeter')}</span>
                <button type="button" className="cursor-pointer p-1 text-red-500 hover:text-red-400" onClick={() => removeItem('perimeter')}
                  aria-label={t('systems.zones.delete', 'Delete')} title={t('systems.zones.delete', 'Delete')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )}
            {value.zones.map((z) => (
              <li key={z.id} className={`flex items-center gap-2 px-3 py-1.5 ${selectedId === z.id ? (isDark ? 'bg-slate-700/60' : 'bg-violet-50') : ''}`}>
                <ShapeBadge shape={z.shape} color={ZONE_COLORS[z.kind]} label={z.shape === 'line' ? t('systems.zones.line', 'Line') : z.shape === 'point' ? t('systems.zones.pin', 'Pin') : t('systems.zones.polygon', 'Area')} />
                <input className={`${fieldCls} min-w-0 flex-1`} value={z.name} onKeyDown={stopEnter} placeholder={KIND_LABEL[z.kind]}
                  onFocus={() => focusItem(z.id)}
                  onChange={(e) => patchZone(z.id, { name: e.target.value })} />
                <Select value={z.kind} onValueChange={(v) => patchZone(z.id, { kind: v as ZoneKind })}>
                  <SelectTrigger size="sm" aria-label={t('systems.zones.changeType', 'Change zone type')}
                    className="h-7! w-36 shrink-0 gap-1.5 px-2 text-xs font-medium"
                    style={{ color: ZONE_COLORS[z.kind], background: `${ZONE_COLORS[z.kind]}1f`, borderColor: `${ZONE_COLORS[z.kind]}80` }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : ''}>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONE_COLORS[k] }} />
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button type="button" className="cursor-pointer p-1 text-red-500 hover:text-red-400" onClick={() => removeItem(z.id)}
                  aria-label={t('systems.zones.delete', 'Delete')} title={t('systems.zones.delete', 'Delete')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
