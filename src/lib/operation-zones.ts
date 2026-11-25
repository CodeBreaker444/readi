import { z } from 'zod';

/**
 * Operation zones of a system (stored in tool.tool_metadata.operationZones).
 * All points are [lat, lng] (WGS84). KML uses lng,lat — conversion happens in the parser only.
 */
export type ZoneKind = 'green' | 'red' | 'unsurveyed';
export type ZoneShape = 'polygon' | 'line';
export type LatLngTuple = [number, number];

export interface OperationZone {
  id: string;
  name: string;
  kind: ZoneKind;
  shape: ZoneShape;
  points: LatLngTuple[];
}

export interface OperationPerimeter {
  name: string;
  points: LatLngTuple[];
}

export interface OperationZones {
  zones: OperationZone[];
  perimeter: OperationPerimeter | null;
}

export const EMPTY_ZONES: OperationZones = { zones: [], perimeter: null };

export const ZONE_COLORS: Record<ZoneKind, string> = {
  green: '#22c55e',
  red: '#ef4444',
  unsurveyed: '#9ca3af',
};
export const PERIMETER_COLOR = '#06b6d4';

export const MAX_ZONES = 500;
export const MAX_POINTS = 5000;
/** Across all zones of one system, keeps the stored JSON (and flight-request checks) small. */
export const MAX_TOTAL_POINTS = 100000;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
/** A red line (e.g. a power line) blocks a waypoint within this distance. */
export const LINE_BUFFER_METERS = 30;

export function countPoints(v: { zones: { points: unknown[] }[]; perimeter: { points: unknown[] } | null }): number {
  return v.zones.reduce((n, z) => n + z.points.length, 0) + (v.perimeter?.points.length ?? 0);
}

/** Keeps at most `max` points (evenly spaced, always keeping the first and last). */
export function decimate<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const out: T[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
  return out;
}

const pointSchema = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

export const operationZonesSchema = z.object({
  zones: z.array(z.object({
    id: z.string().min(1).max(64),
    name: z.string().trim().max(120),
    kind: z.enum(['green', 'red', 'unsurveyed']),
    shape: z.enum(['polygon', 'line']),
    points: z.array(pointSchema).min(2).max(MAX_POINTS),
  }).refine((z) => z.shape === 'line' || z.points.length >= 3, { message: 'A polygon needs at least 3 points' }))
    .max(MAX_ZONES),
  perimeter: z.object({
    name: z.string().trim().max(120),
    points: z.array(pointSchema).min(3).max(MAX_POINTS),
  }).nullable(),
}).refine((v) => countPoints(v) <= MAX_TOTAL_POINTS, { message: `Too many points (max ${MAX_TOTAL_POINTS})` });

/** Reads zones out of stored metadata, tolerating missing or malformed data. */
export function readOperationZones(metadata: unknown): OperationZones {
  const raw = (metadata as { operationZones?: unknown } | null)?.operationZones;
  const parsed = operationZonesSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  // Salvage whatever is still valid (e.g. data edited by hand) instead of dropping every zone.
  const r = (raw ?? {}) as { zones?: unknown; perimeter?: unknown };
  const zoneItem = operationZonesSchema.shape.zones.element;
  const zones = Array.isArray(r.zones)
    ? r.zones.flatMap((z) => { const p = zoneItem.safeParse(z); return p.success ? [p.data] : []; })
    : [];
  const per = operationZonesSchema.shape.perimeter.safeParse(r.perimeter);
  const out: OperationZones = { zones: zones.slice(0, MAX_ZONES), perimeter: per.success ? per.data : null };
  return countPoints(out) <= MAX_TOTAL_POINTS ? out : { zones: [], perimeter: null };
}

export function hasZones(z: OperationZones | null | undefined): boolean {
  return !!z && (z.zones.length > 0 || !!z.perimeter);
}

export function newZoneId(): string {
  return `z_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export const KIND_LABEL: Record<ZoneKind, string> = {
  green: 'Green zone',
  red: 'Red zone',
  unsurveyed: 'Unsurveyed zone',
};

/** Next free default name, e.g. "Red zone 3". */
export function nextZoneName(zones: OperationZone[], kind: ZoneKind): string {
  const n = zones.filter((z) => z.kind === kind).length + 1;
  return `${KIND_LABEL[kind]} ${n}`;
}

// ── Geometry ────────────────────────────────────────────────────────────────

/** Ray casting; points are [lat, lng]. */
export function pointInPolygon(lat: number, lng: number, poly: LatLngTuple[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Distance in metres from a point to a segment, using a local equirectangular projection. */
export function distanceToSegmentMeters(lat: number, lng: number, a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371000;
  const cos = Math.cos((lat * Math.PI) / 180);
  const toXY = (p: LatLngTuple) => [((p[1] - lng) * Math.PI / 180) * R * cos, ((p[0] - lat) * Math.PI / 180) * R];
  const [ax, ay] = toXY(a);
  const [bx, by] = toXY(b);
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (-ax * dx - ay * dy) / len2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function distanceToLineMeters(lat: number, lng: number, line: LatLngTuple[]): number {
  let min = Infinity;
  for (let i = 0; i < line.length - 1; i++) {
    min = Math.min(min, distanceToSegmentMeters(lat, lng, line[i], line[i + 1]));
  }
  return min;
}

export type ZoneWarningType = 'red' | 'unsurveyed' | 'outside_perimeter' | 'not_in_green';

export interface ZoneWarning {
  type: ZoneWarningType;
  severity: 'danger' | 'warning';
  /** Name of the zone involved (when applicable). */
  zoneName?: string;
}

export interface ZoneCheckResult {
  /** True when the point is inside a green zone, inside the perimeter and clear of red/unsurveyed zones. */
  clear: boolean;
  warnings: ZoneWarning[];
}

/**
 * Checks a point against one system's zones. Red zones/lines are danger; leaving the perimeter,
 * entering an unsurveyed zone, or not being covered by any green zone are warnings.
 */
export function checkPointAgainstZones(lat: number, lng: number, zones: OperationZones): ZoneCheckResult {
  const warnings: ZoneWarning[] = [];
  let inGreen = false;

  for (const z of zones.zones) {
    const hit = z.shape === 'polygon'
      ? pointInPolygon(lat, lng, z.points)
      : distanceToLineMeters(lat, lng, z.points) <= LINE_BUFFER_METERS;
    if (!hit) continue;
    if (z.kind === 'red') warnings.push({ type: 'red', severity: 'danger', zoneName: z.name });
    else if (z.kind === 'unsurveyed') warnings.push({ type: 'unsurveyed', severity: 'warning', zoneName: z.name });
    else if (z.shape === 'polygon') inGreen = true;
  }

  if (zones.perimeter && !pointInPolygon(lat, lng, zones.perimeter.points)) {
    warnings.push({ type: 'outside_perimeter', severity: 'warning', zoneName: zones.perimeter.name });
  }

  const hasGreen = zones.zones.some((z) => z.kind === 'green' && z.shape === 'polygon');
  if (hasGreen && !inGreen && !warnings.some((w) => w.type === 'red')) {
    warnings.push({ type: 'not_in_green', severity: 'warning' });
  }

  return { clear: warnings.length === 0, warnings };
}

export function boundsOf(zones: OperationZones): [[number, number], [number, number]] | null {
  const pts: LatLngTuple[] = [...zones.zones.flatMap((z) => z.points), ...(zones.perimeter?.points ?? [])];
  if (pts.length === 0) return null;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const [la, ln] of pts) {
    minLat = Math.min(minLat, la); maxLat = Math.max(maxLat, la);
    minLng = Math.min(minLng, ln); maxLng = Math.max(maxLng, ln);
  }
  return [[minLat, minLng], [maxLat, maxLng]];
}

// ── KML / KMZ import ────────────────────────────────────────────────────────
// https://developers.google.com/kml/documentation/kmzarchives — a KMZ is a ZIP whose root holds a .kml
// (conventionally doc.kml) plus referenced resources. Only Polygon / LineString / LinearRing geometry is imported.

export interface KmlImportResult {
  zones: OperationZone[];
  perimeter: OperationPerimeter | null;
  /** Placemarks without usable line/polygon geometry (points, ground overlays, ...). */
  skipped: number;
  /** Additional perimeter-looking shapes beyond the first one. */
  extraPerimeters: number;
}

/** KML colors are aabbggrr hex. */
function kmlColorToRgb(hex: string | null | undefined): [number, number, number] | null {
  if (!hex) return null;
  const h = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{8}$/.test(h)) return null;
  return [parseInt(h.slice(6, 8), 16), parseInt(h.slice(4, 6), 16), parseInt(h.slice(2, 4), 16)];
}

function classifyColor(rgb: [number, number, number] | null): ZoneKind | null {
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (max === 0 || d / max < 0.18) return 'unsurveyed'; // grey / white / black
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  if (h >= 75 && h <= 170) return 'green';
  if (h <= 45 || h >= 320) return 'red';
  return null; // blue/yellow/etc: ambiguous, let names decide
}

const RE_PERIMETER = /(perimeter|boundary|fence|geofence|operational\s*(area|limit)|operating\s*area|limite)/i;
const RE_RED = /(\bred\b|no[\s-]?fly|restrict|prohibit|forbidden|danger|hazard|exclusion|rosso|vietat)/i;
const RE_GREEN = /(\bgreen\b|\bsafe\b|allowed|approved|authori[sz]ed|permitted|cleared|verde)/i;
const RE_GREY = /(unsurvey|unknown|\bgr[ae]y\b|unverified|unmapped|grigi)/i;

function classifyByName(text: string): ZoneKind | 'perimeter' | null {
  if (RE_PERIMETER.test(text)) return 'perimeter';
  if (RE_GREY.test(text)) return 'unsurveyed';
  if (RE_RED.test(text)) return 'red';
  if (RE_GREEN.test(text)) return 'green';
  return null;
}

function parseCoordinates(text: string | null | undefined): LatLngTuple[] {
  if (!text) return [];
  const out: LatLngTuple[] = [];
  for (const tuple of text.trim().split(/\s+/)) {
    const [lngS, latS] = tuple.split(',');
    const lng = Number(lngS);
    const lat = Number(latS);
    if (lngS === '' || latS === undefined || latS === '' || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    out.push([lat, lng]);
  }
  return out;
}

const localName = (el: Element) => el.localName || el.nodeName.split(':').pop() || '';
const childrenNamed = (el: Element, name: string) => Array.from(el.children).filter((c) => localName(c) === name);
const firstChild = (el: Element, name: string) => childrenNamed(el, name)[0] ?? null;
const descendants = (el: Element, name: string) => Array.from(el.getElementsByTagName('*')).filter((c) => localName(c) === name);
const textOf = (el: Element | null) => el?.textContent?.trim() ?? '';

/** Parses KML text (browser DOMParser). Throws if the XML is invalid. */
export function parseKml(kmlText: string): KmlImportResult {
  const doc = new DOMParser().parseFromString(kmlText, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) throw new Error('Invalid KML');

  // Style id -> color (PolyStyle first, then LineStyle). StyleMap resolves through its "normal" pair.
  const styleColors = new Map<string, string>();
  const styleOf = (el: Element): string | null => {
    const poly = firstChild(el, 'PolyStyle');
    const line = firstChild(el, 'LineStyle');
    return textOf(poly && firstChild(poly, 'color')) || textOf(line && firstChild(line, 'color')) || null;
  };
  for (const s of descendants(doc.documentElement, 'Style')) {
    const id = s.getAttribute('id');
    const c = styleOf(s);
    if (id && c) styleColors.set(`#${id}`, c);
  }
  for (const sm of descendants(doc.documentElement, 'StyleMap')) {
    const id = sm.getAttribute('id');
    if (!id) continue;
    const normal = childrenNamed(sm, 'Pair').find((p) => textOf(firstChild(p, 'key')) === 'normal');
    const ref = textOf(normal ? firstChild(normal, 'styleUrl') : null);
    const inline = normal ? firstChild(normal, 'Style') : null;
    const c = (ref && styleColors.get(ref)) || (inline && styleOf(inline));
    if (c) styleColors.set(`#${id}`, c);
  }

  const result: KmlImportResult = { zones: [], perimeter: null, skipped: 0, extraPerimeters: 0 };

  const collectGeometries = (el: Element, out: { shape: ZoneShape; points: LatLngTuple[] }[]) => {
    for (const child of Array.from(el.children)) {
      const n = localName(child);
      if (n === 'MultiGeometry') collectGeometries(child, out);
      else if (n === 'Polygon') {
        const outer = firstChild(child, 'outerBoundaryIs');
        const ring = outer && descendants(outer, 'coordinates')[0];
        out.push({ shape: 'polygon', points: parseCoordinates(ring?.textContent) });
      } else if (n === 'LineString' || n === 'LinearRing') {
        out.push({ shape: n === 'LinearRing' ? 'polygon' : 'line', points: parseCoordinates(firstChild(child, 'coordinates')?.textContent) });
      }
    }
  };

  const walk = (el: Element, folders: string[]) => {
    for (const child of Array.from(el.children)) {
      const n = localName(child);
      if (n === 'Folder' || n === 'Document') {
        walk(child, [...folders, textOf(firstChild(child, 'name'))].filter(Boolean));
      } else if (n === 'Placemark') {
        const name = textOf(firstChild(child, 'name'));
        const geoms: { shape: ZoneShape; points: LatLngTuple[] }[] = [];
        collectGeometries(child, geoms);
        const usable = geoms.filter((g) => g.points.length >= (g.shape === 'polygon' ? 3 : 2));
        if (usable.length === 0) { result.skipped++; continue; }

        const styleUrl = textOf(firstChild(child, 'styleUrl'));
        const inline = firstChild(child, 'Style');
        const color = (inline && styleOf(inline)) || styleColors.get(styleUrl) || null;
        const kind = classifyByName(name) ?? classifyColor(kmlColorToRgb(color)) ?? classifyByName(folders.join(' ')) ?? 'unsurveyed';

        usable.forEach((g, i) => {
          let points = g.points;
          if (g.shape === 'polygon' && points.length > 3) {
            const [a, b] = [points[0], points[points.length - 1]];
            if (a[0] === b[0] && a[1] === b[1]) points = points.slice(0, -1); // drop the KML closing vertex
          }
          if (g.shape === 'polygon' && points.length < 3) { result.skipped++; return; }
          points = decimate(points, MAX_POINTS);
          const label = (name || 'Imported zone') + (usable.length > 1 ? ` ${i + 1}` : '');

          if (kind === 'perimeter') {
            // The perimeter is always a closed polygon, so a perimeter line is closed implicitly.
            if (points.length < 3) { result.skipped++; return; }
            if (result.perimeter) result.extraPerimeters++;
            else result.perimeter = { name: label, points };
            return;
          }
          result.zones.push({ id: newZoneId(), name: label.slice(0, 120), kind, shape: g.shape, points });
        });
      }
    }
  };
  walk(doc.documentElement, []);

  return result;
}

/** Reads a .kml or .kmz file (KMZ = ZIP with a root .kml, usually doc.kml). */
export async function parseKmlOrKmzFile(file: File): Promise<KmlImportResult> {
  if (file.size > MAX_IMPORT_BYTES) throw new Error('File is larger than 10 MB');
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.kml')) return parseKml(await file.text());
  if (!lower.endsWith('.kmz')) throw new Error('Unsupported file type');

  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const kmlEntries = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith('.kml'));
  // Spec: the main file sits at the archive root; prefer doc.kml, then any root-level .kml, then anything.
  const entry =
    kmlEntries.find((f) => f.name.toLowerCase() === 'doc.kml') ??
    kmlEntries.find((f) => !f.name.includes('/')) ??
    kmlEntries[0];
  if (!entry) throw new Error('No KML found inside the KMZ');
  // Guard against zip bombs: the declared uncompressed size must be sane before inflating.
  const declared = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (typeof declared === 'number' && declared > MAX_IMPORT_BYTES * 5) throw new Error('KML inside the KMZ is too large');
  return parseKml(await entry.async('string'));
}
