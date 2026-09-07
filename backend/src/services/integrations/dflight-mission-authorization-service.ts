import 'server-only';
import { prisma } from '@/lib/prisma';
import { env } from '@/backend/config/env';
import { getDFlightIntegration } from './dflight-settings-service';
import {
  getDFlightToken,
  getDFlightUserInfo,
  createDFlightMission,
  type DFlightCreateMissionInput,
} from '@/lib/dflight-service';
import { signReadiControlJwt } from '@/lib/drone-atc-jwt';

export interface DFlightAuthorizationResult {
  outcome: 'success' | 'skipped' | 'error';
  message: string;
}

/**
 * D-Flight's Create4DFA call requires the mission's flight geometry as
 * buffered LINESTRINGs (geo_data.trajectory_data). readi doesn't currently
 * capture a flight path for a mission — only a free-text `location` string —
 * so there is no real source for this yet. Returns null until that exists;
 * fabricating coordinates here would be actively wrong for an airspace
 * authorization call, so callers must treat null as "not ready to submit".
 */
function buildTrajectoryFromMission(): DFlightCreateMissionInput['geo_data'] | null {
  return null;
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

    // Sent as-is (null when not yet captured) rather than blocking the call —
    // see buildTrajectoryFromMission's doc comment for why this is a stub.
    const geoData = buildTrajectoryFromMission();

    const tokenResponse = await getDFlightToken(
      { base_url: integration.base_url, username: integration.username, password: integration.password ?? undefined, client_id: integration.client_id },
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    const userInfo = await getDFlightUserInfo(
      integration.base_url,
      tokenResponse.access_token,
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    const startDateTime = mission.scheduled_start.toISOString();
    const durationMinutes = mission.flight_duration ?? 15;
    const endDateTime = new Date(mission.scheduled_start.getTime() + durationMinutes * 60_000).toISOString();

    const result = await createDFlightMission(
      integration.base_url,
      tokenResponse.access_token,
      {
        mission_name: mission.mission_name ?? `Mission ${pilotMissionId}`,
        description: mission.mission_description ?? undefined,
        drone_id: droneId,
        mission_type: 'OPEN',
        flight_condition_type: 'VLOS',
        operator_id: userInfo.operatorRegistrationNumber ?? '',
        easa_operator_id: integration.easa_operator_code ?? '',
        start_date_time: startDateTime,
        end_date_time: endDateTime,
        mission_duration: durationMinutes,
        max_height: 120,
        max_speed: 15,
        geo_data: geoData ?? null,
        operational_scanario: 'BVLOS-NO-STD',
        uas_operational_category: 'OPEN',
        is_automatic_clearance: true,
        uspace_id: '',
      },
      integration.pfx_content ?? undefined,
      integration.pfx_password ?? undefined,
    );

    await prisma.pilot_mission.update({
      where: { pilot_mission_id: pilotMissionId },
      data: {
        dflight_mission_id: result.mission_id,
        dflight_tech_version: result.tech_version,
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
 * created on D-Flight. flytrelay's receiving endpoint doesn't exist yet
 * (pending Rounak) — this call is non-fatal and simply logs until it does.
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

    const durationMinutes = mission.flight_duration ?? 15;
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
        missionEndDateTime,
      }),
      signal: AbortSignal.timeout(10_000),
    });

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
