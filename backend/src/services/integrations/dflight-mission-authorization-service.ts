import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { env } from '@/backend/config/env';
import { getDFlightIntegration } from './dflight-settings-service';
import {
  getDFlightToken,
  getDFlightUserInfo,
  getDFlightUspaceList,
  createDFlightMission,
  type DFlightCreateMissionInput,
  type DFlightMissionTrajectoryElement,
  type DFlightUspaceResult,
} from '@/lib/dflight-service';
import { signReadiControlJwt } from '@/lib/drone-atc-jwt';
import { toUtm33N } from '@/backend/utils/utm-projection';
import { parseWaypoints, type PlanningWaypoint } from '@/backend/utils/planning-waypoints';

export interface DFlightAuthorizationResult {
  outcome: 'success' | 'skipped' | 'error';
  message: string;
}

/**
 * Splits [startDateTime, endDateTime] evenly across each waypoint-to-waypoint
 * segment and projects lat/lng to EPSG:32633 (UTM 33N) — D-Flight's
 * mission_reference_frame for the Italian ENAV airspace it operates in.
 */
function buildTrajectoryData(
  waypoints: PlanningWaypoint[],
  startDateTime: string,
  endDateTime: string,
): DFlightCreateMissionInput['geo_data'] | null {
  if (waypoints.length < 2) return null;

  const start = new Date(startDateTime).getTime();
  const end = new Date(endDateTime).getTime();
  const segmentCount = waypoints.length - 1;
  const segmentMs = (end - start) / segmentCount;

  // Placeholder buffer/height values — same reasoning as max_height/max_speed
  // below: readi has no per-mission flight parameters yet. Should switch to
  // planning_logbook.flight_parameters once that's captured.
  const H_BUFFER = 50;
  const V_BUFFER = 10;
  const MIN_OPERATIVE_HEIGHT = 0;
  const MAX_OPERATIVE_HEIGHT = 120;

  const trajectory_data: DFlightMissionTrajectoryElement[] = waypoints.slice(1).map((point, i) => {
    const from = toUtm33N(waypoints[i].lat, waypoints[i].lng);
    const to = toUtm33N(point.lat, point.lng);
    const entry = new Date(start + i * segmentMs).toISOString();
    const exit = new Date(start + (i + 1) * segmentMs).toISOString();

    return {
      trj_element_type: 'LINESTRING',
      trj_element: `LINESTRING(${from.x} ${from.y}, ${to.x} ${to.y})`,
      h_buffer: H_BUFFER,
      v_buffer: V_BUFFER,
      min_operative_height: MIN_OPERATIVE_HEIGHT,
      max_operative_height: MAX_OPERATIVE_HEIGHT,
      entry_date_time: entry,
      exit_date_time: exit,
      buffer_entry_date_time: entry,
      buffer_exit_date_time: exit,
    };
  });

  return { mission_reference_frame: '32633', trajectory_data };
}

/**
 * Sources flight-path data from the mission's selected mission plan
 * (planning_logbook.waypoints), falling back to any other mission plan under
 * the same evaluation if that one hasn't been drawn yet. Only applies to PDRA
 * missions created with a planning + mission plan selected — other missions
 * have no waypoint source and are left null (caller treats null as "skip").
 */
async function buildTrajectoryFromMission(
  mission: {
    fk_planning_id: number | null;
    fk_mission_planning_id: number | null;
    mission_metadata: Prisma.JsonValue;
  },
  startDateTime: string,
  endDateTime: string,
): Promise<DFlightCreateMissionInput['geo_data'] | null> {
  const opType = (mission.mission_metadata as any)?.op_type;
  if (opType !== 'PDRA' || !mission.fk_planning_id || !mission.fk_mission_planning_id) {
    return null;
  }

  const missionPlan = await prisma.planning_logbook.findUnique({
    where: { mission_planning_id: mission.fk_mission_planning_id },
    select: { waypoints: true },
  });

  let waypoints = parseWaypoints(missionPlan?.waypoints);

  if (!waypoints) {
    const planning = await prisma.planning.findUnique({
      where: { planning_id: mission.fk_planning_id },
      select: { fk_evaluation_id: true },
    });

    if (planning?.fk_evaluation_id) {
      const fallback = await prisma.planning_logbook.findFirst({
        where: { fk_evaluation_id: planning.fk_evaluation_id, waypoints: { not: Prisma.DbNull } },
        orderBy: { updated_at: 'desc' },
        select: { waypoints: true },
      });
      waypoints = parseWaypoints(fallback?.waypoints);
    }
  }

  if (!waypoints) return null;

  return buildTrajectoryData(waypoints, startDateTime, endDateTime);
}

async function getMissionDroneId(toolId: number | null): Promise<string | null> {
  if (!toolId) return null;
  const drone = await prisma.tool_component.findFirst({
    where: {
      fk_tool_id: toolId,
      component_type: 'DRONE',
      component_active: 'Y',
      drone_registration_code: { not: null },
    },
    select: { drone_registration_code: true },
  });
  return drone?.drone_registration_code ?? null;
}

export interface DFlightUspaceListResult {
  enabled: boolean;
  uspaces: DFlightUspaceResult[];
  error?: string;
}

/**
 * Fetches the uspaces available to this organization's USSP so the pilot can
 * pick one when submitting a mission for flight authorization. `enabled`
 * reflects the owner's D-Flight feature flag alone — a fetch failure past
 * that point is reported via `error` rather than silently downgrading to
 * "disabled", so the caller can tell "no D-Flight" apart from "D-Flight is
 * on but something's misconfigured".
 */
export async function listDFlightUspaces(ownerId: number): Promise<DFlightUspaceListResult> {
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: { d_flight_enabled: true },
  });

  if (!owner?.d_flight_enabled) return { enabled: false, uspaces: [] };

  try {
    const integration = await getDFlightIntegration(ownerId);
    if (!integration) {
      return { enabled: true, uspaces: [], error: 'No D-Flight credentials configured for this organization' };
    }

    const tokenResponse = await getDFlightToken(
      { base_url: integration.base_url, username: integration.username, password: integration.password ?? undefined, client_id: integration.client_id },
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    const uspaces = await getDFlightUspaceList(
      integration.base_url,
      tokenResponse.access_token,
      'expouss',
      integration.client_id,
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    return { enabled: true, uspaces };
  } catch (err: any) {
    console.error('[dflight-mission-authorization] listDFlightUspaces failed:', err?.message ?? err);
    return { enabled: true, uspaces: [], error: err?.message ?? String(err) };
  }
}

/**
 * Creates the mission on D-Flight (Create4DFA) and stores the returned
 * mission_id/tech_version on the pilot_mission row. Non-fatal by design —
 * callers should log the outcome, not fail mission creation on it, mirroring
 * notifyDccMissionCreation in dcc-callback-service.ts.
 */
export async function createAndSubmitMissionAuthorization(
  pilotMissionId: number,
  ownerId: number,
): Promise<DFlightAuthorizationResult> {
  try {
    const owner = await prisma.owner.findUnique({
      where: { owner_id: ownerId },
      select: { d_flight_enabled: true },
    });
    if (!owner?.d_flight_enabled) {
      return { outcome: 'skipped', message: 'D-Flight is not enabled for this organization' };
    }

    const integration = await getDFlightIntegration(ownerId);
    if (!integration) {
      return { outcome: 'skipped', message: 'No D-Flight credentials configured for this organization' };
    }

    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: pilotMissionId },
      select: {
        mission_name: true,
        mission_description: true,
        scheduled_start: true,
        flight_duration: true,
        fk_tool_id: true,
        fk_planning_id: true,
        fk_mission_planning_id: true,
        mission_metadata: true,
      },
    });
    if (!mission) return { outcome: 'error', message: 'Mission not found' };

    if (!mission.scheduled_start) {
      return { outcome: 'skipped', message: 'Mission has no scheduled start time' };
    }

    const droneId = await getMissionDroneId(mission.fk_tool_id);
    if (!droneId) {
      return {
        outcome: 'skipped',
        message: 'No D-Flight-registered drone assigned to this mission — cannot request authorization yet',
      };
    }

    const startDateTime = mission.scheduled_start.toISOString();
    const durationMinutes = mission.flight_duration ?? 15;
    const endDateTime = new Date(mission.scheduled_start.getTime() + durationMinutes * 60_000).toISOString();

    // geo_data is mandatory on D-Flight's side (errorCode 107000 otherwise) —
    // see buildTrajectoryFromMission's doc comment for how it's sourced.
    const geoData = await buildTrajectoryFromMission(mission, startDateTime, endDateTime);
    if (!geoData) {
      return {
        outcome: 'skipped',
        message: 'Mission has no flight trajectory data — D-Flight requires geo_data to authorize a mission',
      };
    }

    const tokenResponse = await getDFlightToken(
      { base_url: integration.base_url, username: integration.username, password: integration.password ?? undefined, client_id: integration.client_id },
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    const userInfo = await getDFlightUserInfo(
      integration.base_url,
      tokenResponse.access_token,
      integration.client_id,
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

// console.log('geo data:',geoData)

    const uspaceId = (mission.mission_metadata as any)?.uspace_id;

    const result = await createDFlightMission(
      integration.base_url,
      tokenResponse.access_token,
      {
        mission_name: mission.mission_name?.trim() || `Mission ${pilotMissionId}`,
        description: mission.mission_description ?? undefined,
        drone_id: droneId,
        mission_type: 'OPEN',
        flight_condition_type: 'VLOS',
        operator_id: userInfo.operatorRegistrationNumber ?? '',
        easa_operator_id: userInfo.easaOperatorId ?? integration.easa_operator_code ?? '',
        start_date_time: startDateTime,
        end_date_time: endDateTime,
        mission_duration: durationMinutes,
        max_height: 120,
        max_speed: 15,
        block_condition: false,
        geo_data: geoData ?? null,
        operational_scanario: 'BVLOS-NO-STD',
        uas_operational_category: 'OPEN',
        is_automatic_clearance: true,
        uspace_id: uspaceId,
      },
      integration.client_id,
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    await prisma.pilot_mission.update({
      where: { pilot_mission_id: pilotMissionId },
      data: {
        dflight_mission_id: result.mission_id,
        dflight_tech_version: result.tech_version != null ? String(result.tech_version) : null,
        dflight_mission_status: result.mission_status ?? 'SAVED',
        dflight_flight_authorisation_status: null,
        dflight_last_status_at: new Date(),
      },
    });

    return { outcome: 'success', message: `D-Flight mission ${result.mission_id} created` };
  } catch (err: any) {
    console.error('[dflight-mission-authorization] createAndSubmitMissionAuthorization failed:', err?.message ?? err);
    return { outcome: 'error', message: err?.message ?? String(err) };
  }
}

/**
 * Registers a polling watch with flytrelay for a mission that was just
 * created on D-Flight.
 */
export async function registerFlytrelayWatch(
  pilotMissionId: number,
  ownerId: number,
): Promise<DFlightAuthorizationResult> {
  try {
    if (!env.FLYTRELAY_BASE_URL) {
      return { outcome: 'skipped', message: 'FLYTRELAY_BASE_URL is not configured' };
    }

    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: pilotMissionId },
      select: { dflight_mission_id: true, dflight_tech_version: true, scheduled_start: true, flight_duration: true },
    });
    if (!mission?.dflight_mission_id) {
      return { outcome: 'skipped', message: 'No D-Flight mission to watch' };
    }

    const integration = await getDFlightIntegration(ownerId);
    if (!integration) {
      return { outcome: 'skipped', message: 'No D-Flight credentials configured for this organization' };
    }

    const missionStartDateTime = mission.scheduled_start
      ? mission.scheduled_start.toISOString()
      : undefined;

    const durationMinutes = mission.flight_duration ?? 60;
    const missionEndDateTime = mission.scheduled_start
      ? new Date(mission.scheduled_start.getTime() + durationMinutes * 60_000).toISOString()
      : undefined;

    const jwt = signReadiControlJwt(String(ownerId), String(ownerId));

    const url = `${env.FLYTRELAY_BASE_URL.replace(/\/$/, '')}/api/dflight-authorization/watch`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        readiMissionId: pilotMissionId,
        companyId: String(ownerId),
        dflight_credentials: {
          base_url: integration.base_url,
          client_id: integration.client_id,
          username: integration.username,
          password: integration.password ?? undefined,
          pfx_content: integration.pfx_content ?? undefined,
          pfx_password: integration.pfx_password ?? undefined,
        },
        mission_id: mission.dflight_mission_id,
        tech_version: mission.dflight_tech_version,
        pollIntervalSeconds: 30,
        missionStartDateTime,
        missionEndDateTime,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    console.log('flytrelay res:',res.status)
    
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { outcome: 'error', message: `flytrelay watch registration failed (${res.status}): ${text.slice(0, 300)}` };
    }

    await prisma.pilot_mission.update({
      where: { pilot_mission_id: pilotMissionId },
      data: { dflight_watch_active: true },
    });

    return { outcome: 'success', message: 'flytrelay watch registered' };
  } catch (err: any) {
    console.error('[dflight-mission-authorization] registerFlytrelayWatch failed:', err?.message ?? err);
    return { outcome: 'error', message: err?.message ?? String(err) };
  }
}

/**
 * Convenience wrapper: create the D-Flight mission, then hand it off to
 * flytrelay for polling. Called right after a mission is created — always
 * non-fatal, matching notifyDccMissionCreation's call sites.
 */
export async function authorizeMissionWithDFlight(
  pilotMissionId: number,
  ownerId: number,
): Promise<{ create: DFlightAuthorizationResult; watch: DFlightAuthorizationResult | null }> {
  const create = await createAndSubmitMissionAuthorization(pilotMissionId, ownerId);
 console.log('called dflight mission management: ',create)
  if (create.outcome !== 'success') {
    return { create, watch: null };
  }
  const watch = await registerFlytrelayWatch(pilotMissionId, ownerId);
  return { create, watch };
}
