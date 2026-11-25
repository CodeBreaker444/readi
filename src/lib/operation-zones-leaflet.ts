import type * as Leaflet from 'leaflet';
import { OperationZones, PERIMETER_COLOR, ZONE_COLORS } from '@/lib/operation-zones';

interface RenderOptions {
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | 'perimeter') => void;
  /** Prefix for tooltips, e.g. the system code when several systems are overlaid. */
  labelPrefix?: string;
}

/** Draws zones + perimeter into `group` (clearing it first). Shared by the editor and the flight-request overlay. */
export function renderZoneLayers(L: typeof Leaflet, group: Leaflet.LayerGroup, zones: OperationZones, opts: RenderOptions = {}) {
  const { interactive = false, selectedId = null, onSelect, labelPrefix } = opts;
  group.clearLayers();

  const tip = (name: string) => (labelPrefix ? `${labelPrefix} · ${name}` : name);

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
    const layer = z.shape === 'polygon'
      ? L.polygon(z.points, { color, weight: selected ? 4 : 2, fillColor: color, fillOpacity: selected ? 0.4 : 0.25, interactive })
      : L.polyline(z.points, { color, weight: selected ? 6 : 4, interactive });
    if (interactive) layer.on('click', () => onSelect?.(z.id));
    layer.bindTooltip(tip(z.name || z.kind), { sticky: true });
    layer.addTo(group);
  }
}
