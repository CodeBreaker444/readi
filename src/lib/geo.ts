export interface LatLng {
  lat: number;
  lng: number;
}

/** Ray-casting point-in-polygon test against a single ring (not multi-ring/hole aware). */
export function pointInRing(point: LatLng, ring: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng, yi = ring[i].lat;
    const xj = ring[j].lng, yj = ring[j].lat;
    const intersects = (yi > point.lat) !== (yj > point.lat)
      && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True if `point` falls inside any of the given rings (a boundary may have several disjoint parts). */
export function pointInRings(point: LatLng, rings: LatLng[][]): boolean {
  return rings.some((ring) => pointInRing(point, ring));
}

const EARTH_RADIUS_M = 6_371_000;

/** Offsets `origin` by `distanceM` meters at compass `bearingDeg` — accurate enough for the small (≤ a few km) radii D-Flight circles use. */
export function offsetLatLng(origin: LatLng, distanceM: number, bearingDeg: number): LatLng {
  const bearing = (bearingDeg * Math.PI) / 180;
  const latRad = (origin.lat * Math.PI) / 180;
  const angularDist = distanceM / EARTH_RADIUS_M;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDist) + Math.cos(latRad) * Math.sin(angularDist) * Math.cos(bearing),
  );
  const newLngRad = ((origin.lng * Math.PI) / 180) + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDist) * Math.cos(latRad),
    Math.cos(angularDist) - Math.sin(latRad) * Math.sin(newLatRad),
  );

  return { lat: (newLatRad * 180) / Math.PI, lng: (newLngRad * 180) / Math.PI };
}

/**
 * Approximates "is this circle fully inside the boundary" by checking the
 * center plus points spaced around the circumference — cheap and precise
 * enough for a UI validity check without a full polygon-buffer library.
 */
export function circleWithinRings(center: LatLng, radiusM: number, rings: LatLng[][], samples = 16): boolean {
  if (!pointInRings(center, rings)) return false;
  for (let i = 0; i < samples; i++) {
    const bearing = (360 / samples) * i;
    if (!pointInRings(offsetLatLng(center, radiusM, bearing), rings)) return false;
  }
  return true;
}
