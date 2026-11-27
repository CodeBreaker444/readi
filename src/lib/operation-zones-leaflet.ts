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

  /** Always-visible name label (hover tooltips only show on mouse-over, so imported names would be hidden). */
  const addLabel = (text: string, at: Leaflet.LatLngExpression, color: string, offsetY = 0) => {
    if (!text) return;
    const label = L.circleMarker(at, { radius: 0, opacity: 0, fillOpacity: 0, interactive: false });
    label.bindTooltip(text, {
      permanent: true,
      direction: 'center',
      offset: [0, offsetY],
      className: 'zone-name-label',
      opacity: 1,
    });
    // The tooltip element only exists once opened on the map, so style it then.
    label.on('tooltipopen', (e: Leaflet.TooltipEvent) => {
      const el = e.tooltip.getElement();
      if (el) el.style.cssText += `;background:rgba(0,0,0,.65);color:#fff;border:1px solid ${color};border-radius:4px;padding:1px 5px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:none;pointer-events:none`;
    });
    label.addTo(group);
  };
  const centerOf = (pts: [number, number][]): [number, number] => {
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const [la, ln] of pts) {
      minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la);
      minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln);
    }
    return [(minLat + maxLat) / 2, (minLng + maxLng) / 2];
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
    const pName = zones.perimeter.name || 'Perimeter';
    addLabel(labelPrefix ? `${labelPrefix} · ${pName}` : pName, centerOf(zones.perimeter.points), PERIMETER_COLOR, -14);
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
    const labelText = labelPrefix ? `${labelPrefix} · ${z.name}` : z.name;
    if (z.shape === 'point') addLabel(labelText, z.points[0], color, -40);
    else if (z.shape === 'line') addLabel(labelText, z.points[Math.floor(z.points.length / 2)], color);
    else addLabel(labelText, centerOf(z.points), color);
  }
}
