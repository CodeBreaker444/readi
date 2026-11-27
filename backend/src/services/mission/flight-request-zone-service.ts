import { listClientSystemZones } from '@/backend/services/system/system-service';
import { boundsOf, checkPointAgainstZones, hasZones, type OperationZones, readOperationZones } from '@/lib/operation-zones';
import { prisma } from '@/lib/prisma';

/**
 * Checks a client's flight request location against the operation zones of
 * the systems assigned to that client.
 *
 * A location is "operational" for a system when it is clear of every warning
 * the zone check raises: inside the perimeter, inside a green zone (when the
 * system has green zones) and outside every red / unsurveyed zone.
 *
 * Of the systems the location is operational for, the closest one is picked
 * (by the system's own coordinates, or the centre of its zones when it has
 * none). When the client has systems with zones but none covers the location,
 * the request is rejected.
 */

export interface ZoneSystemCandidate {
  toolId: number;
  toolCode: string | null;
  latitude: number | null;
  longitude: number | null;
  operationZones: OperationZones;
}

export interface FlightRequestZoneCheck {
  /** true = inside a system's zones, false = outside all of them, null = could not be checked. */
  validated: boolean | null;
  matchedToolId: number | null;
  matchedToolCode: string | null;
  /** Distance in metres from the requested location to the matched (or, when rejected, nearest) system. */
  distanceM: number | null;
  /** Nearest system when the request is rejected — helps the OPM / client understand why. */
  nearestToolCode: string | null;
  /** Why the check failed or was skipped; null when validated. */
  reason: string | null;
  systemsChecked: number;
  checkedAt: string;
}

/** Waypoint coordinates as sent by clients: GeoJSON Point, [lng, lat, alt?]. */
export function readWaypointLatLng(waypoint: unknown): { lat: number; lng: number } | null {
  const coords = (waypoint as { coordinates?: unknown } | null)?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The system's location: its own coordinates, else the centre of its zones. */
function systemLocation(s: ZoneSystemCandidate): { lat: number; lng: number } | null {
  if (s.latitude != null && s.longitude != null) return { lat: s.latitude, lng: s.longitude };
  const b = boundsOf(s.operationZones);
  if (!b) return null;
  return { lat: (b[0][0] + b[1][0]) / 2, lng: (b[0][1] + b[1][1]) / 2 };
}

/** True when the location is operational for this system's zones. */
export function isPointOperational(lat: number, lng: number, zones: OperationZones): boolean {
  if (!hasZones(zones)) return false;
  return checkPointAgainstZones(lat, lng, zones).clear;
}

/** Pure decision: which system (if any) covers the location. Exported for tests. */
export function pickOperationalSystem(
  lat: number,
  lng: number,
  systems: ZoneSystemCandidate[],
  now: Date = new Date(),
): FlightRequestZoneCheck {
  const base = { checkedAt: now.toISOString(), systemsChecked: systems.length };
  if (systems.length === 0) {
    return {
      ...base, validated: null, matchedToolId: null, matchedToolCode: null, distanceM: null, nearestToolCode: null,
      reason: 'No system with operation zones is assigned to this client',
    };
  }

  const ranked = systems
    .map((s) => {
      const loc = systemLocation(s);
      return {
        s,
        operational: isPointOperational(lat, lng, s.operationZones),
        warnings: hasZones(s.operationZones) ? checkPointAgainstZones(lat, lng, s.operationZones).warnings : [],
        distanceM: loc ? Math.round(haversineMeters(lat, lng, loc.lat, loc.lng)) : Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);

  const match = ranked.find((r) => r.operational);
  if (match) {
    return {
      ...base,
      validated: true,
      matchedToolId: match.s.toolId,
      matchedToolCode: match.s.toolCode,
      distanceM: Number.isFinite(match.distanceM) ? match.distanceM : null,
      nearestToolCode: match.s.toolCode,
      reason: null,
    };
  }

  // Prefer explaining the system whose area the point is actually in (blocked by a zone),
  // over "outside every system" with a far-away nearest system.
  const code = (r: (typeof ranked)[number]) => r.s.toolCode ?? `#${r.s.toolId}`;
  // Being inside a red / unsurveyed zone is itself the reason, wherever that zone is.
  const blocked = ranked.find((r) => r.warnings.some((w) => w.type === 'red' || w.type === 'unsurveyed'));
  // "Inside the perimeter" only makes sense for a system that has one.
  const notGreen = ranked.find((r) => !!r.s.operationZones.perimeter
    && !r.warnings.some((w) => w.type === 'outside_perimeter')
    && r.warnings.some((w) => w.type === 'not_in_green'));
  const explained = blocked ?? notGreen ?? ranked[0];

  let reason: string;
  if (blocked) {
    const w = blocked.warnings.find((x) => x.type === 'red') ?? blocked.warnings.find((x) => x.type === 'unsurveyed')!;
    const zone = w.zoneName ? ` "${w.zoneName}"` : '';
    reason = w.type === 'red'
      ? `Requested location is inside red (no-fly) zone${zone} of system ${code(blocked)}.`
      : `Requested location is inside unsurveyed zone${zone} of system ${code(blocked)}.`;
  } else if (notGreen) {
    reason = `Requested location is inside the perimeter of system ${code(notGreen)} but not in any of its green zones.`;
  } else {
    const km = Number.isFinite(explained.distanceM) ? ` (${(explained.distanceM / 1000).toFixed(1)} km away)` : '';
    reason = `Requested location is outside the operation zones of every system assigned to the client. Nearest system: ${code(explained)}${km}.`;
  }

  return {
    ...base,
    validated: false,
    matchedToolId: null,
    matchedToolCode: null,
    distanceM: Number.isFinite(explained.distanceM) ? explained.distanceM : null,
    nearestToolCode: explained.s.toolCode,
    reason,
  };
}

/** Runs the zone check for a request. Never throws: a failed lookup leaves the request unchecked. */
export async function checkFlightRequestLocation(
  ownerId: number,
  clientId: number | null | undefined,
  waypoint: unknown,
): Promise<FlightRequestZoneCheck> {
  const now = new Date();
  const skipped = (reason: string): FlightRequestZoneCheck => ({
    validated: null, matchedToolId: null, matchedToolCode: null, distanceM: null, nearestToolCode: null,
    reason, systemsChecked: 0, checkedAt: now.toISOString(),
  });

  const point = readWaypointLatLng(waypoint);
  if (!point) return skipped('No waypoint coordinates in the request');
  if (!clientId) return skipped('Request is not linked to a client');

  try {
    const systems = await listClientSystemZones(ownerId, clientId);
    return pickOperationalSystem(point.lat, point.lng, systems, now);
  } catch (err) {
    console.error('[flight-request-zone] zone check failed:', err);
    return skipped('Zone check failed');
  }
}

/** Column values to store the result of a zone check on a flight_requests row. */
export function zoneCheckColumns(check: FlightRequestZoneCheck) {
  return {
    zone_validated: check.validated,
    fk_matched_tool_id: check.matchedToolId,
    zone_check: check as unknown as object,
  };
}

/**
 * True when a mission flown with `toolId` is covered by the request's zone validation:
 * the request passed the check and its location lies inside that system's zones.
 * Such missions do not need OPM authorization.
 */
export async function isRequestCoveredByTool(
  request: { zone_validated: boolean | null; waypoint: unknown },
  toolId: number | null | undefined,
  ownerId: number,
): Promise<boolean> {
  if (request.zone_validated !== true || !toolId) return false;
  const point = readWaypointLatLng(request.waypoint);
  if (!point) return false;
  const tool = await prisma.tool.findFirst({
    where: { tool_id: toolId, fk_owner_id: ownerId },
    select: { tool_metadata: true },
  });
  if (!tool) return false;
  return isPointOperational(point.lat, point.lng, readOperationZones(tool.tool_metadata));
}
