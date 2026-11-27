import type * as Leaflet from 'leaflet';
import { OperationZones, PERIMETER_COLOR, ZONE_COLORS } from '@/lib/operation-zones';

interface RenderOptions {
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | 'perimeter') => void;
  /** Prefix for tooltips, e.g. the system code when several systems are overlaid. */
  labelPrefix?: string;
}

/** Small coloured map pin used for point zones. */
export function pinIcon(L: typeof Leaflet, color: string, large = false) {
  const w = large ? 26 : 20;
  const h = Math.round(w * 1.5);
  return L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${w}" height="${h}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.6))"><path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 24 12 24s12-15.75 12-24C24 5.373 18.627 0 12 0z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="12" r="4.5" fill="#fff"/></svg>`,
    className: '',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
  });
}

/** Draws zones + perimeter into `group` (clearing it first). Shared by the editor and the flight-request overlay. */
export function renderZoneLayers(L: typeof Leaflet, group: Leaflet.LayerGroup, zones: OperationZones, opts: RenderOptions = {}) {
  const { interactive = false, selectedId = null, onSelect, labelPrefix } = opts;
  group.clearLayers();

  const tip = (name: string, note?: string): string | HTMLElement => {
    const title = labelPrefix ? `${labelPrefix} · ${name}` : name;
    if (!note) return title;
    const el = document.createElement('div');
    const b = document.createElement('strong');
    b.textContent = title;
    const n = document.createElement('div');
    n.style.cssText = 'font-size:11px;opacity:.8;max-width:240px;white-space:normal';
    n.textContent = note;
    el.append(b, n);
    return el;
  };

  if (zones.perimeter) {
    const selected = selectedId === 'perimeter';
    const layer = L.polygon(zones.perimeter.points, {
      color: PERIMETER_COLOR,
      weight: selected ? 4 : 3,
      dashArray: '10 6',
      fill: false,
      interactive,
    });
    if (interactive) layer.on('click', () => onSelect?.('perimeter'));
    layer.bindTooltip(tip(zones.perimeter.name || 'Perimeter'), { sticky: true });
    layer.addTo(group);
  }

  for (const z of zones.zones) {
    const color = ZONE_COLORS[z.kind];
    const selected = selectedId === z.id;
    const layer: Leaflet.Layer = z.shape === 'point'
      ? L.marker(z.points[0], { icon: pinIcon(L, color, selected), interactive, keyboard: false, bubblingMouseEvents: true })
      : z.shape === 'polygon'
        ? L.polygon(z.points, { color, weight: selected ? 4 : 2, fillColor: color, fillOpacity: selected ? 0.4 : 0.25, interactive })
        : L.polyline(z.points, { color, weight: selected ? 6 : 4, interactive });
    if (interactive) layer.on('click', () => onSelect?.(z.id));
    layer.bindTooltip(tip(z.name || z.kind, z.note), z.shape === 'point' ? { direction: 'top', offset: [0, -24] } : { sticky: true });
    layer.addTo(group);
  }
}
