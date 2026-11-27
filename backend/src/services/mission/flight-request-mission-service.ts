import {
  notifyDccAcceptanceForMission,
  notifyDccDenial,
  notifyDccExecutionForRequest,
  notifyDccTerminationForRequest,
} from '@/backend/services/mission/dcc-callback-service';
import {
  checkFlightRequestLocation,
  haversineMeters,
  isPointOperational,
  isRequestCoveredByTool,
  readWaypointLatLng,
  zoneCheckColumns,
  type FlightRequestZoneCheck,
} from '@/backend/services/mission/flight-request-zone-service';
import { authorizeMissionWithDFlight } from '@/backend/services/integrations/dflight-mission-authorization-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { listClientSystemZones } from '@/backend/services/system/system-service';
import { boundsOf } from '@/lib/operation-zones';
import { prisma } from '@/lib/prisma';
import type { DccCallbackResult } from '@/types/dcc-callback';

/**
 * Flight request ↔ scheduled mission (pilot_mission) workflow.
 *
 *   NEW ──acknowledge──▶ ACKNOWLEDGED ──link to mission──▶ ASSIGNED
 *   ASSIGNED / IN_PROGRESS follow the linked mission on the Daily Board:
 *     mission PLANNED     → ASSIGNED
 *     mission IN_PROGRESS → IN_PROGRESS   (DCC execution callback)
 *     mission COMPLETED   → COMPLETED     (DCC termination, result 1)
 *     mission ABORTED / CANCELLED → ISSUE (DCC termination, result 0)
 *
 * Nobody sets these statuses by hand any more.
 */

const LINKABLE_REQUEST_STATUSES = ['ACKNOWLEDGED'];
/** Request statuses that keep following the linked mission. */
const SYNCED_REQUEST_STATUSES = ['ASSIGNED', 'IN_PROGRESS'];
const CLOSED_MISSION_STATUSES = ['COMPLETED', 'CANCELLED', 'ABORTED'];

export class FlightRequestLinkError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ── Intake: zone check on every client request ──────────────────────────────

export interface IntakeResult {
  dcc_status: string;
  zone_check: FlightRequestZoneCheck;
  dcc?: DccCallbackResult;
}

/**
 * Checks a freshly received (or re-sent, still NEW) client request against the
 * operation zones of the client's systems and stores the result. A request
 * outside every system's zones is rejected straight away and the client's DCC
 * receives a denial with the reason.
 */
export async function applyIntakeZoneCheck(
  requestId: number,
  ownerId: number,
  clientId: number | null | undefined,
  waypoint: unknown,
  externalMissionId: string,
): Promise<IntakeResult> {
  const check = await checkFlightRequestLocation(ownerId, clientId, waypoint);

  if (check.validated === false) {
    await prisma.flight_requests.update({
      where: { request_id: requestId },
      data: {
        ...zoneCheckColumns(check),
        dcc_status: 'REJECTED',
        deny_note: check.reason,
        updated_at: new Date(),
      },
    });
    logEvent({
      eventType: 'UPDATE',
      entityType: 'flight_request',
      entityId: requestId,
      description: `Flight request ${externalMissionId} automatically rejected — location outside the operation zones of the client's systems`,
      ownerId,
      metadata: { reason: check.reason, nearest_system: check.nearestToolCode, distance_m: check.distanceM },
    });
    const dcc = await notifyDccDenial(ownerId, externalMissionId, check.reason ?? undefined, clientId ?? null);
    return { dcc_status: 'REJECTED', zone_check: check, dcc };
  }

  await prisma.flight_requests.update({
    where: { request_id: requestId },
    data: { ...zoneCheckColumns(check), updated_at: new Date() },
  });
  return { dcc_status: 'NEW', zone_check: check };
}

// ── Link to mission ─────────────────────────────────────────────────────────

export interface LinkableMission {
  pilot_mission_id: number;
  mission_code: string | null;
  mission_name: string | null;
  status_name: string | null;
  scheduled_start: string | null;
  tool_id: number | null;
  tool_code: string | null;
  client_name: string | null;
  opm_approval_status: string | null;
  /** The mission's system zones cover this request: no OPM authorization needed. */
  zone_covered: boolean;
  /** Flight requests already linked to this mission. */
  linked_request_count: number;
}

async function loadRequest(requestId: number, ownerId: number) {
  return prisma.flight_requests.findFirst({
    where: { request_id: requestId, fk_owner_id: ownerId },
    select: {
      request_id: true,
      external_mission_id: true,
      dcc_status: true,
      fk_client_id: true,
      fk_pilot_mission_id: true,
      waypoint: true,
      zone_validated: true,
      fk_matched_tool_id: true,
      zone_check: true,
      target: true,
      mission_type: true,
      start_datetime: true,
      priority: true,
      notes: true,
      operator: true,
      localization: true,
      created_at: true,
    },
  });
}

/**
 * Systems of the request's client that have operation zones: the ones whose
 * zones cover the location first (nearest first), then the rest by distance.
 */
export async function clientZonedTools(
  ownerId: number,
  clientId: number | null,
  point: { lat: number; lng: number } | null,
): Promise<{ ids: number[]; covering: number[] }> {
  if (!clientId) return { ids: [], covering: [] };
  const systems = await listClientSystemZones(ownerId, clientId);
  const ranked = systems
    .map((s) => {
      if (!point) return { id: s.toolId, covers: false, d: 0 };
      const b = boundsOf(s.operationZones);
      const lat = s.latitude ?? (b ? (b[0][0] + b[1][0]) / 2 : point.lat);
      const lng = s.longitude ?? (b ? (b[0][1] + b[1][1]) / 2 : point.lng);
      return { id: s.toolId, covers: isPointOperational(point.lat, point.lng, s.operationZones), d: haversineMeters(point.lat, point.lng, lat, lng) };
    })
    .sort((a, b) => Number(b.covers) - Number(a.covers) || a.d - b.d);
  return { ids: ranked.map((s) => s.id), covering: ranked.filter((s) => s.covers).map((s) => s.id) };
}

/** Planned / in-progress missions a request can be linked to (same client first). */
export async function listLinkableMissions(requestId: number, ownerId: number): Promise<LinkableMission[]> {
  const request = await loadRequest(requestId, ownerId);
  if (!request) throw new FlightRequestLinkError('Flight request not found.', 404);

  const missions = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: ownerId,
      status_name: { in: ['PLANNED', 'IN_PROGRESS'] },
      ...(request.fk_client_id ? { fk_client_id: request.fk_client_id } : {}),
    },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      mission_name: true,
      status_name: true,
      scheduled_start: true,
      fk_tool_id: true,
      opm_approval_status: true,
      tool: { select: { tool_code: true } },
      client: { select: { client_name: true } },
    },
    orderBy: [{ scheduled_start: 'asc' }, { pilot_mission_id: 'desc' }],
    take: 200,
  });

  const zoned = await clientZonedTools(ownerId, request.fk_client_id, readWaypointLatLng(request.waypoint));
  const zonedSet = new Set(zoned.ids);
  const rank = new Map(zoned.ids.map((id, i) => [id, i]));

  const counts = missions.length
    ? await prisma.flight_requests.groupBy({
        by: ['fk_pilot_mission_id'],
        where: { fk_owner_id: ownerId, fk_pilot_mission_id: { in: missions.map((m) => m.pilot_mission_id) } },
        _count: { _all: true },
      })
    : [];
  const countBy = new Map(counts.map((c) => [c.fk_pilot_mission_id as number, c._count._all]));

  const covered = new Map<number, boolean>();
  for (const toolId of new Set(missions.map((m) => m.fk_tool_id).filter((id): id is number => id != null))) {
    covered.set(toolId, await isRequestCoveredByTool(request, toolId, ownerId));
  }

  return missions
    // Only missions on the client's systems that have operation zones (when the client has any).
    .filter((m) => zonedSet.size === 0 || (m.fk_tool_id != null && zonedSet.has(m.fk_tool_id)))
    // Covering systems first; the sort is stable, so the date order is kept within a system.
    .sort((a, b) => (rank.get(a.fk_tool_id ?? -1) ?? 0) - (rank.get(b.fk_tool_id ?? -1) ?? 0))
    .map((m) => ({
    pilot_mission_id: m.pilot_mission_id,
    mission_code: m.mission_code,
    mission_name: m.mission_name,
    status_name: m.status_name,
    scheduled_start: m.scheduled_start?.toISOString() ?? null,
    tool_id: m.fk_tool_id,
    tool_code: m.tool?.tool_code ?? null,
    client_name: m.client?.client_name ?? null,
    opm_approval_status: m.opm_approval_status,
    zone_covered: m.fk_tool_id != null && covered.get(m.fk_tool_id) === true,
    linked_request_count: countBy.get(m.pilot_mission_id) ?? 0,
  }));
}

/** Checks that a request can be linked; used both before creating a mission and when linking. */
export async function assertRequestLinkable(requestId: number, ownerId: number) {
  const request = await loadRequest(requestId, ownerId);
  if (!request) throw new FlightRequestLinkError('Flight request not found.', 404);
  if (!LINKABLE_REQUEST_STATUSES.includes(request.dcc_status)) {
    throw new FlightRequestLinkError('Only acknowledged flight requests can be linked to a mission.', 409);
  }
  if (request.fk_pilot_mission_id) {
    throw new FlightRequestLinkError('This flight request is already linked to a mission.', 409);
  }
  return request;
}

/**
 * A request can only be flown with one of its client's systems that have operation
 * zones (any system, when the client has none). Checked before creating or linking.
 */
export async function assertToolAllowedForRequest(
  request: { fk_client_id: number | null },
  toolId: number | null | undefined,
  ownerId: number,
): Promise<void> {
  const zoned = await clientZonedTools(ownerId, request.fk_client_id, null);
  if (zoned.ids.length > 0 && (toolId == null || !zoned.ids.includes(toolId))) {
    throw new FlightRequestLinkError("The mission's system is not one of the client's systems with operation zones.", 422);
  }
}

/** True when a new mission for this request, flown with `toolId`, needs no OPM authorization. */
export async function requestSkipsOpmApproval(requestId: number, ownerId: number, toolId: number | null | undefined): Promise<boolean> {
  const request = await loadRequest(requestId, ownerId);
  if (!request) return false;
  return isRequestCoveredByTool(request, toolId, ownerId);
}

export interface LinkResult {
  dcc?: DccCallbackResult;
  /** The mission was waiting for OPM approval and was approved by the zone validation. */
  autoApproved: boolean;
  dcc_status: string;
}

/**
 * Links an acknowledged request to a scheduled mission and tells the client's
 * DCC the request was accepted (with the mission system's drone id).
 */
export async function linkFlightRequestToMission(params: {
  requestId: number;
  missionId: number;
  ownerId: number;
  userId: number | null;
  userName?: string;
  userEmail?: string;
  userRole?: string;
}): Promise<LinkResult> {
  const { requestId, missionId, ownerId, userId } = params;
  const request = await assertRequestLinkable(requestId, ownerId);

  const mission = await prisma.pilot_mission.findFirst({
    where: { pilot_mission_id: missionId, fk_owner_id: ownerId },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      status_name: true,
      fk_tool_id: true,
      opm_approval_status: true,
    },
  });
  if (!mission) throw new FlightRequestLinkError('Mission not found.', 404);
  if (CLOSED_MISSION_STATUSES.includes(mission.status_name ?? '')) {
    throw new FlightRequestLinkError('A completed, cancelled or aborted mission cannot be linked.', 409);
  }
  await assertToolAllowedForRequest(request, mission.fk_tool_id, ownerId);

  // Atomic: a parallel link of the same request must not win twice.
  const updated = await prisma.flight_requests.updateMany({
    where: { request_id: requestId, fk_owner_id: ownerId, dcc_status: { in: LINKABLE_REQUEST_STATUSES }, fk_pilot_mission_id: null },
    data: {
      fk_pilot_mission_id: missionId,
      dcc_status: 'ASSIGNED',
      assigned_by_user_id: userId,
      assigned_at: new Date(),
      updated_at: new Date(),
    },
  });
  if (updated.count === 0) throw new FlightRequestLinkError('This flight request is already linked to a mission.', 409);

  // A mission waiting for OPM authorization is approved by the zone validation:
  // only when the request passed the zone check and the mission's system covers its location.
  let autoApproved = false;
  if (mission.opm_approval_status === 'PENDING' && await isRequestCoveredByTool(request, mission.fk_tool_id, ownerId)) {
    const approved = await prisma.pilot_mission.updateMany({
      where: { pilot_mission_id: missionId, opm_approval_status: 'PENDING' },
      data: {
        opm_approval_status: 'APPROVED',
        opm_approval_decided_at: new Date(),
        opm_approval_note: `Auto-approved: linked to flight request ${request.external_mission_id}, whose location is inside the operation zones of the mission system.`,
        updated_at: new Date(),
      },
    });
    autoApproved = approved.count > 0;
    if (autoApproved) {
      try {
        await authorizeMissionWithDFlight(missionId, ownerId);
      } catch (err) {
        console.warn('[flight-request link] D-Flight authorization failed (non-fatal):', err);
      }
    }
  }

  logEvent({
    eventType: 'UPDATE',
    entityType: 'flight_request',
    entityId: requestId,
    description: `Flight request ${request.external_mission_id} linked to mission ${mission.mission_code ?? `#${missionId}`}${autoApproved ? ' (mission auto-approved by zone validation)' : ''}`,
    userId: userId ?? undefined,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    ownerId,
    metadata: { mission_id: missionId, auto_approved: autoApproved },
  });

  const dcc = await notifyDccAcceptanceForMission(ownerId, requestId, mission.fk_tool_id);

  // Linked to a mission that is already flying: catch up straight away.
  await syncFlightRequestsForMission(missionId);
  const after = await prisma.flight_requests.findUnique({ where: { request_id: requestId }, select: { dcc_status: true } });

  return { dcc, autoApproved, dcc_status: after?.dcc_status ?? 'ASSIGNED' };
}

// ── Status sync from the mission (Daily Board) ─────────────────────────────

export function requestStatusForMission(missionStatus: string | null | undefined): string | null {
  switch (missionStatus) {
    case 'PLANNED': return 'ASSIGNED';
    case 'IN_PROGRESS': return 'IN_PROGRESS';
    case 'COMPLETED': return 'COMPLETED';
    case 'ABORTED':
    case 'CANCELLED': return 'ISSUE';
    default: return null;
  }
}

/**
 * Moves every flight request linked to a mission to the status matching the
 * mission's current status, and tells the client's DCC. Never throws: a failed
 * sync must not undo the mission status change that triggered it.
 */
export async function syncFlightRequestsForMission(missionId: number): Promise<void> {
  try {
    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: missionId },
      select: { status_name: true, fk_owner_id: true, abort_reason: true },
    });
    if (!mission) return;
    const target = requestStatusForMission(mission.status_name);
    if (!target) return;

    const requests = await prisma.flight_requests.findMany({
      where: { fk_pilot_mission_id: missionId, dcc_status: { in: SYNCED_REQUEST_STATUSES } },
      select: { request_id: true, external_mission_id: true, fk_client_id: true, dcc_status: true },
    });

    for (const r of requests) {
      if (r.dcc_status === target) continue;
      // Only move if nobody else moved it in the meantime.
      const moved = await prisma.flight_requests.updateMany({
        where: { request_id: r.request_id, dcc_status: r.dcc_status },
        data: { dcc_status: target, updated_at: new Date() },
      });
      if (moved.count === 0) continue;

      if (target === 'IN_PROGRESS') {
        await notifyDccExecutionForRequest(mission.fk_owner_id, r.external_mission_id, r.fk_client_id);
      } else if (target === 'COMPLETED') {
        await notifyDccTerminationForRequest(mission.fk_owner_id, r.external_mission_id, 1, undefined, r.fk_client_id);
      } else if (target === 'ISSUE') {
        await notifyDccTerminationForRequest(
          mission.fk_owner_id, r.external_mission_id, 0,
          mission.abort_reason ?? `Mission ${mission.status_name?.toLowerCase()}`, r.fk_client_id,
        );
      }
    }
  } catch (err) {
    console.error('[flight-request sync] failed for mission', missionId, err);
  }
}

/**
 * Called before a mission is deleted: linked requests that have not finished go
 * back to ACKNOWLEDGED so they can be linked again.
 */
export async function unlinkFlightRequestsForMission(missionId: number): Promise<void> {
  await prisma.flight_requests.updateMany({
    where: { fk_pilot_mission_id: missionId, dcc_status: { in: SYNCED_REQUEST_STATUSES } },
    data: { fk_pilot_mission_id: null, dcc_status: 'ACKNOWLEDGED', assigned_at: null, assigned_by_user_id: null, updated_at: new Date() },
  });
  await prisma.flight_requests.updateMany({
    where: { fk_pilot_mission_id: missionId },
    data: { fk_pilot_mission_id: null, updated_at: new Date() },
  });
}

// ── Context for the New Mission modal ───────────────────────────────────────

export interface FlightRequestMissionContext {
  request_id: number;
  external_mission_id: string;
  client_id: number | null;
  client_name: string | null;
  mission_type: string | null;
  target: string | null;
  priority: string | null;
  notes: string | null;
  operator: string | null;
  start_datetime: string | null;
  received_at: string;
  latitude: number | null;
  longitude: number | null;
  localization: Record<string, unknown> | null;
  zone_validated: boolean | null;
  matched_tool_id: number | null;
  matched_tool_code: string | null;
  distance_m: number | null;
  /** Client systems with operation zones: covering ones first (nearest first), then the rest. */
  zoned_tool_ids: number[];
  /** Of those, the systems whose zones cover the request location (no OPM approval needed). */
  covering_tool_ids: number[];
}

export async function getFlightRequestMissionContext(requestId: number, ownerId: number): Promise<FlightRequestMissionContext> {
  const request = await assertRequestLinkable(requestId, ownerId);
  const [client, tool] = await Promise.all([
    request.fk_client_id
      ? prisma.client.findFirst({ where: { client_id: request.fk_client_id, fk_owner_id: ownerId }, select: { client_name: true } })
      : null,
    request.fk_matched_tool_id
      ? prisma.tool.findFirst({ where: { tool_id: request.fk_matched_tool_id, fk_owner_id: ownerId }, select: { tool_code: true } })
      : null,
  ]);
  const point = readWaypointLatLng(request.waypoint);
  const check = request.zone_check as Partial<FlightRequestZoneCheck> | null;
  const zoned = await clientZonedTools(ownerId, request.fk_client_id, point);
  return {
    request_id: request.request_id,
    external_mission_id: request.external_mission_id,
    client_id: request.fk_client_id,
    client_name: client?.client_name ?? null,
    mission_type: request.mission_type,
    target: request.target,
    priority: request.priority,
    notes: request.notes,
    operator: request.operator,
    start_datetime: request.start_datetime?.toISOString() ?? null,
    received_at: request.created_at.toISOString(),
    latitude: point?.lat ?? null,
    longitude: point?.lng ?? null,
    localization: request.localization as Record<string, unknown> | null,
    zone_validated: request.zone_validated,
    matched_tool_id: request.fk_matched_tool_id,
    matched_tool_code: tool?.tool_code ?? check?.matchedToolCode ?? null,
    distance_m: check?.distanceM ?? null,
    zoned_tool_ids: zoned.ids,
    covering_tool_ids: request.zone_validated === true ? zoned.covering : [],
  };
}
