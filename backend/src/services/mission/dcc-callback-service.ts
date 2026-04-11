import 'server-only';

import { supabase } from '@/backend/database/database';
import { getDccCallbackUrl } from './dcc-settings-service';

// ---------------------------------------------------------------------------
// Helpers — resolve external IDs
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Low-level fetch helper
// ---------------------------------------------------------------------------

async function dccPost(ownerId: number, path: string, body?: unknown): Promise<void> {
  const base = await getDccCallbackUrl(ownerId);
  if (!base) {
    console.warn(`[DCC] No DCC integration configured for owner ${ownerId} — skipping callback to ${path}`);
    return;
  }

  const url = `${base.replace(/\/$/, '')}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[DCC] ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
    } else {
      console.info(`[DCC] ${path} → OK`);
    }
  } catch (err: any) {
    console.error(`[DCC] ${path} → fetch error: ${err?.message ?? err}`);
  }
}

// ---------------------------------------------------------------------------
// Public callbacks — all fire-and-forget (never throw)
// ---------------------------------------------------------------------------

/**
 * POST /dcc/missions/{missionId}/acceptance
 * Called when OPM assigns a flight_request to a planning mission.
 */
export async function notifyDccAcceptance(
  ownerId: number,
  planningId: number,
  externalMissionId?: string,
): Promise<void> {
  try {
    const missionId = externalMissionId ?? await getExternalMissionIdForPlanning(planningId);
    if (!missionId) {
      console.warn('[DCC] acceptance: could not resolve external_mission_id for planning', planningId);
      return;
    }

    const droneId = await getDccDroneIdForPlanning(planningId);
    if (!droneId) {
      console.warn(
        `[DCC] acceptance: no dcc_drone_id found for planning ${planningId}. ` +
        'Add tool.dcc_drone_id (UUID) to enable this callback.',
      );
      return;
    }

    await dccPost(ownerId, `/dcc/missions/${missionId}/acceptance`, { droneId });
  } catch (err: any) {
    console.error('[DCC] notifyDccAcceptance error:', err?.message ?? err);
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
): Promise<void> {
  try {
    await dccPost(ownerId, `/dcc/missions/${externalMissionId}/denial`, { note: note ?? '' });
  } catch (err: any) {
    console.error('[DCC] notifyDccDenial error:', err?.message ?? err);
  }
}

/**
 * POST /dcc/missions/{missionId}/execution
 * Called when a mission moves to IN_PROGRESS (_START).
 */
export async function notifyDccExecution(missionId: number): Promise<void> {
  try {
    const [externalId, ownerId] = await Promise.all([
      getExternalMissionIdForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    if (!externalId || !ownerId) {
      console.warn('[DCC] execution: could not resolve IDs for mission', missionId);
      return;
    }
    await dccPost(ownerId, `/dcc/missions/${externalId}/execution`);
  } catch (err: any) {
    console.error('[DCC] notifyDccExecution error:', err?.message ?? err);
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
): Promise<void> {
  try {
    const [externalId, ownerId] = await Promise.all([
      getExternalMissionIdForMission(missionId),
      getOwnerIdForMission(missionId),
    ]);
    if (!externalId || !ownerId) {
      console.warn('[DCC] termination: could not resolve IDs for mission', missionId);
      return;
    }
    await dccPost(ownerId, `/dcc/missions/${externalId}/termination`, { result, note: note ?? '' });
  } catch (err: any) {
    console.error('[DCC] notifyDccTermination error:', err?.message ?? err);
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
): Promise<void> {
  try {
    const externalId = await getExternalMissionIdForMission(missionId);
    if (!externalId) {
      console.warn('[DCC] logging: no external_mission_id for mission', missionId);
      return;
    }
    await dccPost(ownerId, `/dcc/missions/${externalId}/logging`, { uri });
  } catch (err: any) {
    console.error('[DCC] notifyDccLogging error:', err?.message ?? err);
  }
}
