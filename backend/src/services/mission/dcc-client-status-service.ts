import 'server-only';

import { prisma } from '@/lib/prisma';
import { assertSafeCallbackUrl } from '@/lib/safe-url';

export type MissionStatusName = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABORTED';

export interface DccClientEndpoint {
  id: number;
  fk_client_id: number;
  client_name: string;
  status_url: string | null;
  callback_url: string | null;
  active: boolean;
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
    active: r.active,
  }));
}

/**
 * Creates or updates the URLs for one client. `undefined` leaves a URL as it is,
 * `null` clears it. Returns false if the client is not in this owner.
 */
export async function upsertClientEndpoint(
  ownerId: number,
  clientId: number,
  urls: { statusUrl?: string | null; callbackUrl?: string | null },
  active: boolean,
): Promise<boolean> {
  const client = await prisma.client.findFirst({
    where: { client_id: clientId, fk_owner_id: ownerId },
    select: { client_id: true },
  });
  if (!client) return false;

  await prisma.dcc_client_endpoints.upsert({
    where: { fk_owner_id_fk_client_id: { fk_owner_id: ownerId, fk_client_id: clientId } },
    update: {
      ...(urls.statusUrl !== undefined ? { status_url: urls.statusUrl } : {}),
      ...(urls.callbackUrl !== undefined ? { callback_url: urls.callbackUrl } : {}),
      active,
      updated_at: new Date(),
    },
    create: {
      fk_owner_id: ownerId,
      fk_client_id: clientId,
      status_url: urls.statusUrl ?? null,
      callback_url: urls.callbackUrl ?? null,
      active,
    },
  });
  return true;
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
    if (!endpoint?.active || !endpoint.status_url) return;

    // External id is only present for missions requested by a third party.
    const flightRequest = mission.fk_planning_id
      ? await prisma.flight_requests.findFirst({
          where: { fk_planning_id: mission.fk_planning_id },
          orderBy: { created_at: 'desc' },
          select: { external_mission_id: true },
        })
      : null;

    const resolvedNote = note ?? (status === 'ABORTED' ? mission.abort_reason : null);

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

    const authUser = process.env.DCC_AUTH_USERNAME ?? 'dcc';
    const authPass = process.env.DCC_AUTH_PASSWORD ?? 'dcc';
    const basicAuth = Buffer.from(`${authUser}:${authPass}`).toString('base64');

    await assertSafeCallbackUrl(endpoint.status_url);

    const res = await fetch(endpoint.status_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicAuth}` },
      body: JSON.stringify(payload),
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
