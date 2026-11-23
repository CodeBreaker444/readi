import 'server-only';

import { decryptToken, encryptToken } from '@/backend/utils/token-encryption';
import { prisma } from '@/lib/prisma';
import { assertSafeCallbackUrl } from '@/lib/safe-url';
import { randomBytes } from 'crypto';
import { buildDccAuthHeaders } from './dcc-http';
import { notifyDccInternalMissionStatus } from './dcc-callback-service';
import { scopeAllows, type MissionScope } from './dcc-settings-service';

export type MissionStatusName = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';

export interface DccClientEndpoint {
  id: number;
  fk_client_id: number;
  client_name: string;
  status_url: string | null;
  callback_url: string | null;
  mission_scope: MissionScope;
  api_key_last6: string | null;
  active: boolean;
}

export async function getClientLabel(ownerId: number, clientId: number): Promise<string> {
  const c = await prisma.client.findFirst({
    where: { client_id: clientId, fk_owner_id: ownerId },
    select: { client_code: true, client_name: true },
  });
  return c?.client_code || c?.client_name || `#${clientId}`;
}

function generateApiKey(): string {
  return `dcckey_${randomBytes(24).toString('hex')}`;
}

export async function listClientEndpoints(ownerId: number): Promise<DccClientEndpoint[]> {
  const rows = await prisma.dcc_client_endpoints.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { id: 'asc' },
  });
  if (rows.length === 0) return [];

  const clients = await prisma.client.findMany({
    where: { client_id: { in: rows.map((r) => r.fk_client_id) }, fk_owner_id: ownerId },
    select: { client_id: true, client_name: true },
  });
  const names = new Map(clients.map((c) => [c.client_id, c.client_name]));

  return rows.map((r) => ({
    id: r.id,
    fk_client_id: r.fk_client_id,
    client_name: names.get(r.fk_client_id) ?? `Client #${r.fk_client_id}`,
    status_url: r.status_url,
    callback_url: r.callback_url,
    mission_scope: (r.mission_scope ?? 'ALL') as MissionScope,
    api_key_last6: r.api_key_last6,
    active: r.active,
  }));
}

/**
 * Creates or updates the integration of one client. `undefined` leaves a field as it is,
 * `null` clears a URL. Returns null if the client is not in this owner; otherwise
 * `apiKey` holds the plaintext key ONLY when one was just generated (first save) —
 * it is never retrievable afterwards.
 */
export async function upsertClientEndpoint(
  ownerId: number,
  clientId: number,
  data: { statusUrl?: string | null; callbackUrl?: string | null; missionScope?: MissionScope },
  active: boolean,
): Promise<{ created: boolean; apiKey: string | null } | null> {
  const client = await prisma.client.findFirst({
    where: { client_id: clientId, fk_owner_id: ownerId },
    select: { client_id: true },
  });
  if (!client) return null;

  const existing = await prisma.dcc_client_endpoints.findUnique({
    where: { fk_owner_id_fk_client_id: { fk_owner_id: ownerId, fk_client_id: clientId } },
    select: { id: true, api_key_encrypted: true },
  });

  // A key is issued when the integration is first created (or has none yet).
  const apiKey = existing?.api_key_encrypted ? null : generateApiKey();
  const keyData = apiKey ? { api_key_encrypted: encryptToken(apiKey), api_key_last6: apiKey.slice(-6) } : {};

  await prisma.dcc_client_endpoints.upsert({
    where: { fk_owner_id_fk_client_id: { fk_owner_id: ownerId, fk_client_id: clientId } },
    update: {
      ...(data.statusUrl !== undefined ? { status_url: data.statusUrl } : {}),
      ...(data.callbackUrl !== undefined ? { callback_url: data.callbackUrl } : {}),
      ...(data.missionScope !== undefined ? { mission_scope: data.missionScope } : {}),
      ...keyData,
      active,
      updated_at: new Date(),
    },
    create: {
      fk_owner_id: ownerId,
      fk_client_id: clientId,
      status_url: data.statusUrl ?? null,
      callback_url: data.callbackUrl ?? null,
      mission_scope: data.missionScope ?? 'ALL',
      ...keyData,
      active,
    },
  });
  return { created: !existing, apiKey };
}

/** Replaces the key of an integration. Returns the new plaintext key once, or null if there is no such integration. */
export async function rotateClientEndpointKey(
  ownerId: number,
  clientId: number,
): Promise<{ apiKey: string; last6: string } | null> {
  const apiKey = generateApiKey();
  const res = await prisma.dcc_client_endpoints.updateMany({
    where: { fk_owner_id: ownerId, fk_client_id: clientId },
    data: { api_key_encrypted: encryptToken(apiKey), api_key_last6: apiKey.slice(-6), updated_at: new Date() },
  });
  return res.count === 1 ? { apiKey, last6: apiKey.slice(-6) } : null;
}

export async function deleteClientEndpoint(ownerId: number, clientId: number): Promise<void> {
  await prisma.dcc_client_endpoints.deleteMany({
    where: { fk_owner_id: ownerId, fk_client_id: clientId },
  });
}

/**
 * POSTs the mission's current status to the URL configured for the mission's
 * client. Works for every mission with a client — it does not require the
 * mission to have come from an external (DCC) flight request.
 *
 * Fire-and-forget safe: never throws, so a failing client endpoint can't break
 * the status change that triggered it.
 */
export async function notifyClientMissionStatus(
  missionId: number,
  status: MissionStatusName,
  note?: string | null,
): Promise<void> {
  try {
    const mission = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: missionId },
      select: {
        fk_owner_id: true,
        fk_client_id: true,
        fk_planning_id: true,
        mission_code: true,
        mission_name: true,
        scheduled_start: true,
        actual_start: true,
        actual_end: true,
        abort_reason: true,
      },
    });
    if (!mission?.fk_client_id) return;

    const endpoint = await prisma.dcc_client_endpoints.findUnique({
      where: {
        fk_owner_id_fk_client_id: { fk_owner_id: mission.fk_owner_id, fk_client_id: mission.fk_client_id },
      },
    });
    if (!endpoint?.active || (!endpoint.status_url && !endpoint.callback_url)) return;

    // External id is only present for missions requested by a third party.
    const flightRequest = mission.fk_planning_id
      ? await prisma.flight_requests.findFirst({
          where: { fk_planning_id: mission.fk_planning_id },
          orderBy: { created_at: 'desc' },
          select: { external_mission_id: true },
        })
      : null;

    // The integration decides which missions it receives: requested externally vs created in Readi.
    if (!scopeAllows(endpoint.mission_scope, flightRequest ? 'EXTERNAL' : 'INTERNAL')) return;

    const resolvedNote = note ?? (status === 'ABORTED' ? mission.abort_reason : null);

    // Missions created in Readi: start / finish go to the callback URL in the DCC structure too.
    // (External ones are already reported by the flight-requests flow, so they are not repeated here.)
    // Independent of the status URL: a failure in one must not stop the other.
    if (!flightRequest && endpoint.callback_url) {
      await notifyDccInternalMissionStatus(
        mission.fk_owner_id,
        mission.fk_client_id,
        mission.mission_code ?? String(missionId),
        status,
        resolvedNote,
      ).catch((e) => console.error('[DCC client status] callback failed:', e?.message ?? e));
    }

    if (!endpoint.status_url) return;

    const payload = {
      missionId: flightRequest?.external_mission_id ?? mission.mission_code ?? String(missionId),
      missionCode: mission.mission_code,
      missionName: mission.mission_name,
      status,
      note: resolvedNote ?? '',
      scheduledStart: mission.scheduled_start?.toISOString() ?? null,
      actualStart: mission.actual_start?.toISOString() ?? null,
      actualEnd: mission.actual_end?.toISOString() ?? null,
      sentAt: new Date().toISOString(),
    };

    await assertSafeCallbackUrl(endpoint.status_url);

    const bodyText = JSON.stringify(payload);
    const apiKey = endpoint.api_key_encrypted ? decryptToken(endpoint.api_key_encrypted) : null;
    const res = await fetch(endpoint.status_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...buildDccAuthHeaders(apiKey, bodyText) },
      body: bodyText,
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`[DCC client status] mission ${missionId} → HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error('[DCC client status] failed:', err?.message ?? err);
  }
}
