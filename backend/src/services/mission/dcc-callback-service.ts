import 'server-only';

import { prisma } from '@/lib/prisma';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { resolveDccEndpoint } from './dcc-settings-service';
import { sendDccRequest } from './dcc-http';
import { enqueueFailedCallback } from './dcc-outbox-service';

/**
 * Returns the external_mission_id the DCC system uses for callbacks,
 * by finding the flight_request linked to a given planning_id.
 */
async function getExternalMissionIdForPlanning(planningId: number): Promise<string | null> {
  return (await getFlightRequestForPlanning(planningId))?.external_mission_id ?? null;
}

interface LinkedRequest {
  external_mission_id: string;
  fk_client_id: number | null;
}

/** Latest flight request linked to a planning, with the client whose key sent it. */
async function getFlightRequestForPlanning(planningId: number): Promise<LinkedRequest | null> {
  return prisma.flight_requests.findFirst({
    where: { fk_planning_id: planningId },
    orderBy: { created_at: 'desc' },
    select: { external_mission_id: true, fk_client_id: true },
  });
}

/** Flight request linked to a mission via its planning (null if never requested externally). */
async function getFlightRequestForMission(missionId: number): Promise<LinkedRequest | null> {
  const row = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: missionId },
    select: { fk_planning_id: true },
  });
  if (!row?.fk_planning_id) return null;
  return getFlightRequestForPlanning(row.fk_planning_id);
}

/**
 * Returns the external_mission_id for a given pilot_mission.
 *
 * For DCC-initiated missions: walks pilot_mission → planning → flight_requests.
 * For PMVD-initiated missions: falls back to mission_code (which stores the
 * PMVD-generated UUID assigned at creation time).
 */
export async function getExternalMissionIdForMission(missionId: number): Promise<string | null> {
  return (await resolveMissionTarget(missionId)).externalId;
}

/**
 * External id + the client whose callback URL should receive it.
 * strict = the mission was requested through a client's API key, so the
 * callback must never fall back to another client's / the org-level URL.
 */
async function resolveMissionTarget(
  missionId: number,
): Promise<{ externalId: string | null; clientId: number | null; strict: boolean }> {
  const row = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: missionId },
    select: { fk_planning_id: true, mission_code: true, fk_client_id: true },
  });

  if (!row) return { externalId: null, clientId: null, strict: false };

  if (row.fk_planning_id) {
    const request = await getFlightRequestForPlanning(row.fk_planning_id);
    if (request) {
      return {
        externalId: request.external_mission_id,
        clientId: request.fk_client_id,
        strict: request.fk_client_id != null,
      };
    }
  }

  // Fallback: PMVD-initiated missions store their DCC ID in mission_code
  return { externalId: row.mission_code ?? null, clientId: row.fk_client_id ?? null, strict: false };
}

/**
 * Returns the external_mission_id ONLY if the mission was initiated by a
 * third-party service .  
 */
async function getExternalMissionIdFromFlightRequest(missionId: number): Promise<string | null> {
  return (await getFlightRequestForMission(missionId))?.external_mission_id ?? null;
}

/**
 * Returns owner_id for a given pilot_mission — needed to look up DCC URL.
 */
async function getOwnerIdForMission(missionId: number): Promise<number | null> {
  const row = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: missionId },
    select: { planning: { select: { fk_owner_id: true } } },
  });
  return row?.planning?.fk_owner_id ?? null;
}

/**
 * Returns the dcc_drone_id of a DRONE component attached to any system
 * (tool) assigned to this planning. A planning can have several systems
 * attached via separate pilot_mission rows, and only one of them may have
 * dcc_drone_id set on its DRONE component, so all are checked rather than
 * just the most recent one. If several qualifying components are found
 * (e.g. a tool with more than one active DRONE component), the most
 * recently installed one is used. Returns null if no tool is assigned or
 * none of them have a DRONE component with dcc_drone_id set.
 */
async function getDccDroneIdForPlanning(planningId: number): Promise<string | null> {
  try {
    const missions = await prisma.pilot_mission.findMany({
      where: { fk_planning_id: planningId, fk_tool_id: { not: null } },
      select: { fk_tool_id: true },
    });

    const toolIds = [...new Set(missions.map((m) => m.fk_tool_id as number))];
    if (toolIds.length === 0) return null;

    const component = await prisma.tool_component.findFirst({
      where: {
        fk_tool_id: { in: toolIds },
        component_type: 'DRONE',
        component_active: 'Y',
        dcc_drone_id: { not: null },
      },
      orderBy: [{ installation_date: 'desc' }, { created_at: 'desc' }],
      select: { dcc_drone_id: true },
    });

    return component?.dcc_drone_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns the dcc_drone_id for one specific Mission Planning Logbook entry
 * ("plan"), by looking at just that entry's assigned tool. Used when the
 * caller (e.g. the flight-requests page) already knows exactly which plan
 * the user picked, avoiding the ambiguity in getDccDroneIdForPlanning when a
 * planning has several mission plans on different systems.
 */
async function getDccDroneIdForMissionPlanning(missionPlanningId: number): Promise<string | null> {
  try {
    const plan = await prisma.planning_logbook.findUnique({
      where: { mission_planning_id: missionPlanningId },
      select: { fk_tool_id: true },
    });
    if (!plan?.fk_tool_id) return null;

    const component = await prisma.tool_component.findFirst({
      where: {
        fk_tool_id: plan.fk_tool_id,
        component_type: 'DRONE',
        component_active: 'Y',
        dcc_drone_id: { not: null },
      },
      orderBy: [{ installation_date: 'desc' }, { created_at: 'desc' }],
      select: { dcc_drone_id: true },
    });

    return component?.dcc_drone_id ?? null;
  } catch {
    return null;
  }
}


interface DccTarget {
  /** Client whose callback URL receives this call. */
  clientId?: number | null;
  /** True for requests that came in through a client's key: never fall back to the org URL. */
  strict?: boolean;
  /** Don't queue a retry if this fails. */
  noRetry?: boolean;
}

async function dccPost(
  ownerId: number,
  path: string,
  body?: unknown,
  target: DccTarget = {},
): Promise<DccCallbackResult> {
  // strict = came in through a client's API key = an external request; the rest is created in Readi.
  const resolved = await resolveDccEndpoint(ownerId, target.clientId, target.strict ? 'EXTERNAL' : 'INTERNAL');
  if (!resolved.ok) {
    return { path, outcome: 'skipped', message: resolved.reason };
  }

  const { url: base, apiKey } = resolved.endpoint;
  const url = `${base.replace(/\/$/, '')}${path}`;
  const result = await sendDccRequest(url, path, body, apiKey);

  // Keep failures so they are retried by cron and can be resent manually.
  // Not for calls whose caller already aborts on failure (a late retry would contradict that).
  if ((result.outcome === 'http_error' || result.outcome === 'network_error') && !target.noRetry) {
    await enqueueFailedCallback(ownerId, path, body, target, result);
  }
  return result;
}


/**
 * POST /dcc/missions/{missionId}/acceptance
 * Called when OPM assigns a flight_request to a planning mission.
 */
export async function notifyDccAcceptance(
  ownerId: number,
  planningId: number,
  externalMissionId?: string,
  missionPlanningId?: number,
  requestId?: number,
): Promise<DccCallbackResult> {
  try {
    // When the caller knows the exact request (assign route), use it: a planning
    // can be linked to requests from several clients.
    const request = requestId
      ? await prisma.flight_requests.findFirst({
          where: { request_id: requestId, fk_owner_id: ownerId },
          select: { external_mission_id: true, fk_client_id: true },
        })
      : await getFlightRequestForPlanning(planningId);
    const missionId = externalMissionId ?? request?.external_mission_id ?? null;
    const target: DccTarget = { clientId: request?.fk_client_id, strict: request?.fk_client_id != null };
    const path = `/dcc/missions/${missionId ?? 'unknown'}/acceptance`;
    if (!missionId) {
      console.warn('[DCC] acceptance: could not resolve external_mission_id for planning', planningId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve external_mission_id for this planning mission',
      };
    }

    const droneId = missionPlanningId
      ? await getDccDroneIdForMissionPlanning(missionPlanningId)
      : await getDccDroneIdForPlanning(planningId);
    if (!droneId) {
      console.warn(
        `[DCC] acceptance: no DRONE component with dcc_drone_id found for planning ${planningId}. ` +
          'Set dcc_drone_id (UUID) on the DRONE component to enable this callback.',
      );
      return {
        path: `/dcc/missions/${missionId}/acceptance`,
        outcome: 'skipped',
        message: 'No dcc_drone_id on DRONE component — DCC acceptance not sent',
      };
    }

    return await dccPost(ownerId, `/dcc/missions/${missionId}/acceptance`, { droneId }, target);
  } catch (err: any) {
    console.error('[DCC] notifyDccAcceptance error:', err?.message ?? err);
    return {
      path: '/dcc/missions/…/acceptance',
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}

/**
 * POST /dcc/missions/{missionId}/denial
 * Called when OPM denies a flight_request.
 */
export async function notifyDccDenial(
  ownerId: number,
  externalMissionId: string,
  note?: string,
  clientId?: number | null,
): Promise<DccCallbackResult> {
  const path = `/dcc/missions/${externalMissionId}/denial`;
  try {
    return await dccPost(ownerId, path, { note: note ?? '' }, { clientId, strict: clientId != null });
  } catch (err: any) {
    console.error('[DCC] notifyDccDenial error:', err?.message ?? err);
    return {
      path,
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}

/**
 * Whether a mission was requested by DCC (i.e. has a flight_request linked
 * via planning with a resolvable external_mission_id), as opposed to being
 * created directly in PMVD. Used to skip DCC execution/termination callbacks
 * for missions DCC never asked for.
 */
export async function isMissionRequestedByDcc(missionId: number): Promise<boolean> {
  const externalId = await getExternalMissionIdFromFlightRequest(missionId);
  return externalId != null;
}

/**
 * POST /dcc/missions/{missionId}/execution
 * Direct variant for callers that already have the owner and external
 * mission id at hand (e.g. the flight-requests page setting dcc_status to
 * IN_PROGRESS), skipping the pilot_mission → planning lookup.
 */
export async function notifyDccExecutionForRequest(
  ownerId: number,
  externalMissionId: string,
  clientId?: number | null,
): Promise<DccCallbackResult> {
  const path = `/dcc/missions/${externalMissionId}/execution`;
  try {
    return await dccPost(ownerId, path, undefined, { clientId, strict: clientId != null });
  } catch (err: any) {
    console.error('[DCC] notifyDccExecutionForRequest error:', err?.message ?? err);
    return { path, outcome: 'network_error', message: err?.message ?? String(err) };
  }
}

/**
 * POST /dcc/missions/{missionId}/termination
 * Direct variant for callers that already have the owner and external
 * mission id at hand (e.g. the flight-requests page setting dcc_status to
 * COMPLETED), skipping the pilot_mission → planning lookup.
 * result: 1 = success, 0 = failure
 */
export async function notifyDccTerminationForRequest(
  ownerId: number,
  externalMissionId: string,
  result: 1 | 0 = 1,
  note?: string,
  clientId?: number | null,
): Promise<DccCallbackResult> {
  const path = `/dcc/missions/${externalMissionId}/termination`;
  try {
    return await dccPost(ownerId, path, { result, note: note ?? '' }, { clientId, strict: clientId != null });
  } catch (err: any) {
    console.error('[DCC] notifyDccTerminationForRequest error:', err?.message ?? err);
    return { path, outcome: 'network_error', message: err?.message ?? String(err) };
  }
}

/**
 * POST /dcc/missions/{missionId}/execution
 * Called when a mission moves to IN_PROGRESS (_START).
 */
export async function notifyDccExecution(missionId: number): Promise<DccCallbackResult> {
  try {
    const [request, ownerId] = await Promise.all([
      getFlightRequestForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    const externalId = request?.external_mission_id ?? null;
    const path = `/dcc/missions/${externalId ?? 'unknown'}/execution`;
    if (!externalId) {
      return {
        path,
        outcome: 'skipped',
        message: 'Mission has no linked flight request — DCC execution not sent',
      };
    }
    if (!ownerId) {
      console.warn('[DCC] execution: could not resolve owner for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve owner for this operation',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/execution`, undefined, {
      clientId: request?.fk_client_id,
      strict: request?.fk_client_id != null,
    });
  } catch (err: any) {
    console.error('[DCC] notifyDccExecution error:', err?.message ?? err);
    return {
      path: '/dcc/missions/…/execution',
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}

/**
 * POST /dcc/missions/{missionId}/termination
 * Called when a mission moves to DONE (_END).
 * result: 1 = success, 0 = failure
 */
export async function notifyDccTermination(
  missionId: number,
  result: 1 | 0 = 1,
  note?: string,
): Promise<DccCallbackResult> {
  try {
    const [request, ownerId] = await Promise.all([
      getFlightRequestForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    const externalId = request?.external_mission_id ?? null;
    const path = `/dcc/missions/${externalId ?? 'unknown'}/termination`;
    if (!externalId) {
      return {
        path,
        outcome: 'skipped',
        message: 'Mission has no linked flight request — DCC termination not sent',
      };
    }
    if (!ownerId) {
      console.warn('[DCC] termination: could not resolve owner for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve owner for this operation',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/termination`, { result, note: note ?? '' }, {
      clientId: request?.fk_client_id,
      strict: request?.fk_client_id != null,
    });
  } catch (err: any) {
    console.error('[DCC] notifyDccTermination error:', err?.message ?? err);
    return {
      path: '/dcc/missions/…/termination',
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}

/**
 * Start / finish of a mission created inside Readi, in the same DCC structure used for
 * external requests, so a client with only a callback URL still hears about them.
 * IN_PROGRESS → /execution, COMPLETED → /termination (success), ABORTED → /termination (failure).
 * Other statuses have no DCC equivalent (cancellation goes through the bulk cancel call).
 * `missionRef` is the id the client already knows from the "new mission" call (the mission code).
 */
export async function notifyDccInternalMissionStatus(
  ownerId: number,
  clientId: number,
  missionRef: string,
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED',
  note?: string | null,
): Promise<DccCallbackResult | null> {
  const base = `/dcc/missions/${missionRef}`;
  try {
    if (status === 'IN_PROGRESS') return await dccPost(ownerId, `${base}/execution`, undefined, { clientId });
    if (status === 'COMPLETED') return await dccPost(ownerId, `${base}/termination`, { result: 1, note: note ?? '' }, { clientId });
    if (status === 'ABORTED') return await dccPost(ownerId, `${base}/termination`, { result: 0, note: note ?? '' }, { clientId });
    return null;
  } catch (err: any) {
    console.error('[DCC] notifyDccInternalMissionStatus error:', err?.message ?? err);
    return { path: base, outcome: 'network_error', message: err?.message ?? String(err) };
  }
}

export interface DccMissionCreationPayload {
  type: string;
  target?: string;
  localization?: Record<string, unknown>;
  missions: Array<{ missionId: string; startDateTime: string }>;
  priority?: string;
  notes?: string;
  operator?: string;
}

/**
 * POST /dcc/missions
 * Called when PMVD creates a scheduled or on-demand mission.
 */
export async function notifyDccMissionCreation(
  ownerId: number,
  payload: DccMissionCreationPayload,
  clientId?: number | null,
): Promise<DccCallbackResult> {
  const path = '/dcc/missions';
  try {
    return await dccPost(ownerId, path, payload, { clientId });
  } catch (err: any) {
    console.error('[DCC] notifyDccMissionCreation error:', err?.message ?? err);
    return { path, outcome: 'network_error', message: err?.message ?? String(err) };
  }
}

/**
 * POST /dcc/missions/cancel
 * Called when PMVD cancels a scheduled program.
 */
export async function notifyDccBulkCancellation(
  ownerId: number,
  missionIds: string[],
  clientId?: number | null,
): Promise<DccCallbackResult> {
  const path = '/dcc/missions/cancel';
  try {
    // The caller aborts the cancellation if this fails, so never retry it later.
    return await dccPost(ownerId, path, { missionIds }, { clientId, noRetry: true });
  } catch (err: any) {
    console.error('[DCC] notifyDccBulkCancellation error:', err?.message ?? err);
    return { path, outcome: 'network_error', message: err?.message ?? String(err) };
  }
}

/**
 * POST /dcc/missions/{missionId}/logging
 * Called when a flight log is pushed from the requests page.
 */
export async function notifyDccLogging(
  ownerId: number,
  missionId: number,
  uri: string,
): Promise<DccCallbackResult> {
  try {
    const { externalId, clientId, strict } = await resolveMissionTarget(missionId);
    const path = `/dcc/missions/${externalId ?? 'unknown'}/logging`;
    if (!externalId) {
      console.warn('[DCC] logging: no external_mission_id for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'No external_mission_id linked to this mission',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/logging`, { uri }, { clientId, strict });
  } catch (err: any) {
    console.error('[DCC] notifyDccLogging error:', err?.message ?? err);
    return {
      path: '/dcc/missions/…/logging',
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}
