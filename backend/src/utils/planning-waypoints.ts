export interface PlanningWaypoint {
  lat: number;
  lng: number;
  order?: number;
}

export function parseWaypoints(raw: unknown): PlanningWaypoint[] | null {
  if (!Array.isArray(raw)) return null;
  const points: PlanningWaypoint[] = raw
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
    .map((p) => ({ lat: p.lat as number, lng: p.lng as number, order: typeof p.order === 'number' ? p.order : undefined }));
  if (points.length < 2) return null;
  return points.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function firstPolygonGeometry(raw: any): any | null {
  if (!raw) return null;

  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features)) {
    for (const feature of raw.features) {
      const geometry = firstPolygonGeometry(feature);
      if (geometry) return geometry;
    }
    return null;
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return firstPolygonGeometry(raw.geometry);
  }
  if (raw.type === 'Polygon' || raw.type === 'MultiPolygon') {
    return raw;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const geometry = firstPolygonGeometry(item);
      if (geometry) return geometry;
    }
    return null;
  }
  return null;
}

/**
 * Extracts the exterior ring of the first Polygon/MultiPolygon in an
 * evaluation's drawn area (evaluation_metadata.polygon) as an ordered
 * waypoint list — used to seed a new mission plan's flight trajectory before
 * a real flight path has been drawn. Circle areas (a single Point in
 * GeoJSON) are skipped since they can't produce a path.
 */
export function polygonToWaypoints(rawPolygon: unknown): PlanningWaypoint[] | null {
  const geometry = firstPolygonGeometry(rawPolygon);
  if (!geometry) return null;

  const ring: [number, number][] =
    geometry.type === 'Polygon' ? geometry.coordinates?.[0] : geometry.coordinates?.[0]?.[0];
  if (!Array.isArray(ring)) return null;

  const points = ring
    .filter((c): c is [number, number] => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number')
    .map(([lng, lat], order) => ({ lat, lng, order }));

  // Drop the closing point GeoJSON polygons repeat (first === last).
  if (
    points.length > 1 &&
    points[0].lat === points[points.length - 1].lat &&
    points[0].lng === points[points.length - 1].lng
  ) {
    points.pop();
  }

  return points.length >= 2 ? points : null;
}
