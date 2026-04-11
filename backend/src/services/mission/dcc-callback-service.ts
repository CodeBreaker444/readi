import 'server-only';

import { supabase } from '@/backend/database/database';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { getDccCallbackUrl } from './dcc-settings-service';

const BODY_PREVIEW = 800;

function truncateBody(text: string): string {
  const t = text.trim();
  if (t.length <= BODY_PREVIEW) return t;
  return `${t.slice(0, BODY_PREVIEW)}…`;
}

/**
 * Returns the external_mission_id the DCC system uses for callbacks,
 * by finding the flight_request linked to a given planning_id.
 */
async function getExternalMissionIdForPlanning(planningId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('flight_requests')
    .select('external_mission_id')
    .eq('fk_planning_id', planningId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.external_mission_id as string;
}

/**
 * Returns the external_mission_id by walking pilot_mission → planning → flight_requests.
 */
export async function getExternalMissionIdForMission(missionId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('pilot_mission')
    .select('fk_planning_id')
    .eq('pilot_mission_id', missionId)
    .single();

  if (error || !data?.fk_planning_id) return null;
  return getExternalMissionIdForPlanning(data.fk_planning_id as number);
}

/**
 * Returns owner_id for a given pilot_mission — needed to look up DCC URL.
 */
async function getOwnerIdForMission(missionId: number): Promise<number | null> {
  const { data } = await supabase
    .from('pilot_mission')
    .select('planning!pilot_mission_fk_planning_id_fkey(fk_owner_id)')
    .eq('pilot_mission_id', missionId)
    .single();

  return (data?.planning as any)?.fk_owner_id ?? null;
}

/**
 * Best-effort lookup for the DCC drone UUID stored in tool.dcc_drone_id.
 * Returns null if the column does not exist or is not set.
 */
async function getDccDroneIdForPlanning(planningId: number): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('pilot_mission')
      .select('tool!pilot_mission_fk_tool_id_fkey(dcc_drone_id)')
      .eq('fk_planning_id', planningId)
      .not('fk_tool_id', 'is', null)
      .limit(1)
      .single();

    return (data?.tool as any)?.dcc_drone_id ?? null;
  } catch {
    return null;
  }
}
 

async function dccPost(ownerId: number, path: string, body?: unknown): Promise<DccCallbackResult> {
  const base = await getDccCallbackUrl(ownerId);
  if (!base) {
    return {
      path,
      outcome: 'skipped',
      message: 'DCC integration not configured for this organization',
    };
  }

  const url = `${base.replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text().catch(() => '');
    const responseBody = text ? truncateBody(text) : undefined;

    if (!res.ok) {
      console.error(`[DCC] ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      return {
        path,
        outcome: 'http_error',
        message: `DCC returned an error`,
        httpStatus: res.status,
        responseBody,
      };
    }

    console.info(`[DCC] ${path} → OK`);
    return {
      path,
      outcome: 'success',
      message: 'DCC accepted the callback',
      httpStatus: res.status,
      responseBody,
    };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error(`[DCC] ${path} → fetch error: ${message}`);
    return {
      path,
      outcome: 'network_error',
      message: `Request failed: ${message}`,
    };
  }
}

 
/**
 * POST /dcc/missions/{missionId}/acceptance
 * Called when OPM assigns a flight_request to a planning mission.
 */
export async function notifyDccAcceptance(
  ownerId: number,
  planningId: number,
  externalMissionId?: string,
): Promise<DccCallbackResult> {
  try {
    const missionId = externalMissionId ?? await getExternalMissionIdForPlanning(planningId);
    const path = `/dcc/missions/${missionId ?? 'unknown'}/acceptance`;
    if (!missionId) {
      console.warn('[DCC] acceptance: could not resolve external_mission_id for planning', planningId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve external_mission_id for this planning mission',
      };
    }

    const droneId = await getDccDroneIdForPlanning(planningId);
    if (!droneId) {
      console.warn(
        `[DCC] acceptance: no dcc_drone_id found for planning ${planningId}. ` +
          'Add tool.dcc_drone_id (UUID) to enable this callback.',
      );
      return {
        path: `/dcc/missions/${missionId}/acceptance`,
        outcome: 'skipped',
        message: 'No dcc_drone_id on assigned tool — DCC acceptance not sent',
      };
    }

    return await dccPost(ownerId, `/dcc/missions/${missionId}/acceptance`, { droneId });
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
): Promise<DccCallbackResult> {
  const path = `/dcc/missions/${externalMissionId}/denial`;
  try {
    return await dccPost(ownerId, path, { note: note ?? '' });
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
 * POST /dcc/missions/{missionId}/execution
 * Called when a mission moves to IN_PROGRESS (_START).
 */
export async function notifyDccExecution(missionId: number): Promise<DccCallbackResult> {
  try {
    const [externalId, ownerId] = await Promise.all([
      getExternalMissionIdForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    const path = `/dcc/missions/${externalId ?? 'unknown'}/execution`;
    if (!externalId || !ownerId) {
      console.warn('[DCC] execution: could not resolve IDs for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve external mission or owner for this operation',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/execution`);
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
    const [externalId, ownerId] = await Promise.all([
      getExternalMissionIdForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    const path = `/dcc/missions/${externalId ?? 'unknown'}/termination`;
    if (!externalId || !ownerId) {
      console.warn('[DCC] termination: could not resolve IDs for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'Could not resolve external mission or owner for this operation',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/termination`, { result, note: note ?? '' });
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
 * POST /dcc/missions/{missionId}/logging
 * Called when a flight log is pushed from the requests page.
 */
export async function notifyDccLogging(
  ownerId: number,
  missionId: number,
  uri: string,
): Promise<DccCallbackResult> {
  try {
    const externalId = await getExternalMissionIdForMission(missionId);
    const path = `/dcc/missions/${externalId ?? 'unknown'}/logging`;
    if (!externalId) {
      console.warn('[DCC] logging: no external_mission_id for mission', missionId);
      return {
        path,
        outcome: 'skipped',
        message: 'No external_mission_id linked to this mission',
      };
    }
    return await dccPost(ownerId, `/dcc/missions/${externalId}/logging`, { uri });
  } catch (err: any) {
    console.error('[DCC] notifyDccLogging error:', err?.message ?? err);
    return {
      path: '/dcc/missions/…/logging',
      outcome: 'network_error',
      message: err?.message ?? String(err),
    };
  }
}
