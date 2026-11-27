import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { applyIntakeZoneCheck } from '@/backend/services/mission/flight-request-mission-service';
import type { FlightRequestZoneCheck } from '@/backend/services/mission/flight-request-zone-service';
import type { DccCallbackResult } from '@/types/dcc-callback';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export interface CreateFlightRequestInput {
  owner_id: number;
  api_key_id: number;
  /** Client the API key belongs to (null for unmapped/legacy keys). */
  client_id?: number | null;
  external_mission_id: string;
  mission_type?: string;
  target?: string;
  localization?: Record<string, unknown>;
  waypoint?: Record<string, unknown>;
  start_datetime?: string;
  priority?: string;
  notes?: string;
  operator?: string;
}

export interface FlightRequest {
  request_id: number;
  fk_owner_id: number;
  external_mission_id: string;
  mission_type: string | null;
  target: string | null;
  localization: Record<string, unknown> | null;
  waypoint: Record<string, unknown> | null;
  start_datetime: string | null;
  priority: string | null;
  notes: string | null;
  operator: string | null;
  dcc_status: string;
  fk_planning_id: number | null;
  assigned_by_user_id: number | null;
  assigned_at: string | null;
  created_at: string;
  fk_client_id: number | null;
  client_name: string | null;
  deny_note: string | null;
  /** true = inside a client system's zones, false = outside (auto-rejected), null = not checked. */
  zone_validated: boolean | null;
  matched_tool_id: number | null;
  matched_tool_code: string | null;
  zone_check: FlightRequestZoneCheck | null;
  /** Scheduled mission the request is linked to. */
  fk_pilot_mission_id: number | null;
  mission_code: string | null;
  mission_status: string | null;
}

type MissionInfo = { pilot_mission_id: number; mission_code: string | null; status_name: string | null };

function mapFlightRequest(row: {
  request_id: number;
  fk_owner_id: number;
  external_mission_id: string;
  mission_type: string | null;
  target: string | null;
  localization: Prisma.JsonValue | null;
  waypoint: Prisma.JsonValue | null;
  start_datetime: Date | null;
  priority: string | null;
  notes: string | null;
  operator: string | null;
  dcc_status: string;
  fk_planning_id: number | null;
  assigned_by_user_id: number | null;
  assigned_at: Date | null;
  created_at: Date;
  fk_client_id: number | null;
  deny_note: string | null;
  zone_validated?: boolean | null;
  fk_matched_tool_id?: number | null;
  zone_check?: Prisma.JsonValue | null;
  fk_pilot_mission_id?: number | null;
}, clientNames?: Map<number, string>, missions?: Map<number, MissionInfo>): FlightRequest {
  const check = (row.zone_check ?? null) as unknown as FlightRequestZoneCheck | null;
  const mission = row.fk_pilot_mission_id ? missions?.get(row.fk_pilot_mission_id) : undefined;
  return {
    request_id: row.request_id,
    fk_owner_id: row.fk_owner_id,
    external_mission_id: row.external_mission_id,
    mission_type: row.mission_type,
    target: row.target,
    localization: row.localization as Record<string, unknown> | null,
    waypoint: row.waypoint as Record<string, unknown> | null,
    start_datetime: row.start_datetime?.toISOString() ?? null,
    priority: row.priority,
    notes: row.notes,
    operator: row.operator,
    dcc_status: row.dcc_status,
    fk_planning_id: row.fk_planning_id,
    assigned_by_user_id: row.assigned_by_user_id,
    assigned_at: row.assigned_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    fk_client_id: row.fk_client_id,
    client_name: row.fk_client_id ? clientNames?.get(row.fk_client_id) ?? null : null,
    deny_note: row.deny_note,
    zone_validated: row.zone_validated ?? null,
    matched_tool_id: row.fk_matched_tool_id ?? null,
    matched_tool_code: check?.matchedToolCode ?? null,
    zone_check: check,
    fk_pilot_mission_id: row.fk_pilot_mission_id ?? null,
    mission_code: mission?.mission_code ?? null,
    mission_status: mission?.status_name ?? null,
  };
}

async function missionMap(ownerId: number, missionIds: Array<number | null>): Promise<Map<number, MissionInfo>> {
  const ids = [...new Set(missionIds.filter((id): id is number => id != null))];
  if (ids.length === 0) return new Map();
  const rows = await prisma.pilot_mission.findMany({
    where: { pilot_mission_id: { in: ids }, fk_owner_id: ownerId },
    select: { pilot_mission_id: true, mission_code: true, status_name: true },
  });
  return new Map(rows.map((m) => [m.pilot_mission_id, m]));
}

async function clientNameMap(ownerId: number, clientIds: Array<number | null>): Promise<Map<number, string>> {
  const ids = [...new Set(clientIds.filter((id): id is number => id != null))];
  if (ids.length === 0) return new Map();
  const clients = await prisma.client.findMany({
    where: { client_id: { in: ids }, fk_owner_id: ownerId },
    select: { client_id: true, client_name: true },
  });
  return new Map(clients.map((c) => [c.client_id, c.client_name]));
}

/**
 * Creates a flight request, or — if DCC has already sent this missionId
 * before (e.g. it timed out waiting for a response and retried) — updates
 * the descriptive fields DCC controls on the existing row instead of
 * rejecting it as a duplicate. dcc_status and the planning assignment are
 * owned by ReADI's own workflow once a request has been picked up, so a
 * retry never resets or overwrites those.
 */
export async function upsertFlightRequestByExternalId(
  input: CreateFlightRequestInput,
): Promise<{ request_id: number; created: boolean; dcc_status: string; reason?: string | null; dcc?: DccCallbackResult }> {
  const existing = await prisma.flight_requests.findFirst({
    // missionIds are only unique per client: two clients may both send "1".
    where: {
      external_mission_id: input.external_mission_id,
      fk_owner_id: input.owner_id,
      fk_client_id: input.client_id ?? null,
    },
    select: { request_id: true, dcc_status: true },
  });

  const sharedData = {
    mission_type:        input.mission_type ?? null,
    target:              input.target ?? null,
    localization:        input.localization ? (input.localization as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    waypoint:            input.waypoint ? (input.waypoint as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    start_datetime:      input.start_datetime ? new Date(input.start_datetime) : null,
    priority:            input.priority ?? null,
    notes:               input.notes ?? null,
    operator:            input.operator ?? null,
  };

  if (existing) {
    await prisma.flight_requests.update({
      where: { request_id: existing.request_id },
      data: { ...sharedData, fk_api_key_id: input.api_key_id, updated_at: new Date() },
    });
    // The location may have changed: re-check while nobody has picked the request up yet.
    if (existing.dcc_status === 'NEW') {
      const intake = await applyIntakeZoneCheck(existing.request_id, input.owner_id, input.client_id, input.waypoint, input.external_mission_id);
      return {
        request_id: existing.request_id,
        created: false,
        dcc_status: intake.dcc_status,
        reason: intake.zone_check.validated === false ? intake.zone_check.reason : null,
        dcc: intake.dcc,
      };
    }
    return { request_id: existing.request_id, created: false, dcc_status: existing.dcc_status };
  }

  const row = await prisma.flight_requests.create({
    data: {
      fk_owner_id:         input.owner_id,
      fk_api_key_id:       input.api_key_id,
      fk_client_id:        input.client_id ?? null,
      external_mission_id: input.external_mission_id,
      ...sharedData,
      dcc_status:          'NEW',
    },
    select: { request_id: true },
  });
  const intake = await applyIntakeZoneCheck(row.request_id, input.owner_id, input.client_id, input.waypoint, input.external_mission_id);
  return {
    request_id: row.request_id,
    created: true,
    dcc_status: intake.dcc_status,
    reason: intake.zone_check.validated === false ? intake.zone_check.reason : null,
    dcc: intake.dcc,
  };
}

export async function listFlightRequests(owner_id: number, status?: string): Promise<FlightRequest[]> {
  const rows = await prisma.flight_requests.findMany({
    where: {
      fk_owner_id: owner_id,
      ...(status && status !== 'ALL' ? { dcc_status: status } : {}),
    },
    orderBy: { created_at: 'desc' },
  });
  const [names, missions] = await Promise.all([
    clientNameMap(owner_id, rows.map((r) => r.fk_client_id)),
    missionMap(owner_id, rows.map((r) => r.fk_pilot_mission_id)),
  ]);
  return rows.map((r) => mapFlightRequest(r, names, missions));
}

/** Acknowledges a NEW request (the planning variant is kept for the legacy DCC API). */
export async function assignFlightRequest(
  request_id: number,
  owner_id: number,
  assigned_by_user_id: number,
  planning_id?: number,
): Promise<boolean> {
  // Acknowledge only a NEW request; the legacy planning assignment also accepts ACKNOWLEDGED.
  // A rejected, cancelled or already progressed request can never be revived this way.
  const updated = await prisma.flight_requests.updateMany({
    where: { request_id, fk_owner_id: owner_id, dcc_status: { in: planning_id ? ['NEW', 'ACKNOWLEDGED'] : ['NEW'] } },
    data: {
      dcc_status:     planning_id ? 'ASSIGNED' : 'ACKNOWLEDGED',
      fk_planning_id: planning_id ?? null,
      assigned_by_user_id,
      assigned_at:    new Date(),
      updated_at:     new Date(),
    },
  });
  return updated.count > 0;
}

export async function updateFlightRequestStatus(
  request_id: number,
  owner_id: number,
  dcc_status: string,
  /** Denial reason: stored when moving to REJECTED (null clears it); ignored for other statuses. */
  deny_note?: string | null,
): Promise<void> {
  await prisma.flight_requests.updateMany({
    where: { request_id, fk_owner_id: owner_id },
    data: {
      dcc_status,
      ...(dcc_status === 'REJECTED' ? { deny_note: deny_note ?? null } : {}),
      updated_at: new Date(),
    },
  });
}

export async function listApiKeys(owner_id: number) {
  const rows = await prisma.api_keys.findMany({
    where: { fk_owner_id: owner_id },
    select: {
      api_key_id: true,
      key_name: true,
      key_prefix: true,
      key_scope: true,
      fk_client_id: true,
      is_active: true,
      last_used_at: true,
      expires_at: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
  const names = await clientNameMap(owner_id, rows.map((r) => r.fk_client_id));
  return rows.map((r) => ({
    api_key_id: r.api_key_id,
    key_name: r.key_name,
    key_prefix: r.key_prefix,
    key_scope: r.key_scope,
    fk_client_id: r.fk_client_id,
    client_name: r.fk_client_id ? names.get(r.fk_client_id) ?? null : null,
    is_active: r.is_active,
    last_used_at: r.last_used_at?.toISOString() ?? null,
    expires_at: r.expires_at?.toISOString() ?? null,
    created_at: r.created_at.toISOString(),
  }));
}

export async function createApiKey(
  owner_id: number,
  key_name: string,
  created_by_user_id: number,
  expires_at?: string,
  userName?: string,
  userEmail?: string,
  userRole?: string,
  client_id?: number | null,
): Promise<{ api_key_id: number; key_value: string } | null> {
  if (client_id) {
    // The client must belong to this owner — otherwise a key could be tied to another tenant's client.
    const client = await prisma.client.findFirst({
      where: { client_id, fk_owner_id: owner_id },
      select: { client_id: true },
    });
    if (!client) return null;
  }

  const rawKey  = `rdi_${randomUUID().replace(/-/g, '')}`;
  const keyHash = hashApiKey(rawKey);
  const prefix  = rawKey.slice(0, 8);

  const row = await prisma.api_keys.create({
    data: {
      fk_owner_id:         owner_id,
      key_name,
      key_value:           keyHash,
      key_prefix:          prefix,
      key_scope:           'mission_request',
      fk_client_id:        client_id ?? null,
      is_active:           true,
      created_by_user_id,
      expires_at:          expires_at ? new Date(expires_at) : null,
    },
    select: { api_key_id: true },
  });

  logEvent({
    eventType: 'CREATE',
    entityType: 'api_key',
    entityId: row.api_key_id,
    description: `API key '${key_name}' created`,
    userId: created_by_user_id,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: owner_id,
    metadata: { keyName: key_name, keyPrefix: prefix, expiresAt: expires_at, clientId: client_id ?? null },
  });

  return { api_key_id: row.api_key_id, key_value: rawKey };
}

export async function revokeApiKey(
  api_key_id: number,
  owner_id: number,
  userId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string,
): Promise<void> {
  const existing = await prisma.api_keys.findFirst({
    where: { api_key_id, fk_owner_id: owner_id },
    select: { key_name: true },
  });

  await prisma.api_keys.updateMany({
    where: { api_key_id, fk_owner_id: owner_id },
    data: { is_active: false },
  });

  logEvent({
    eventType: 'UPDATE',
    entityType: 'api_key',
    entityId: api_key_id,
    description: `API key '${existing?.key_name ?? `#${api_key_id}`}' revoked`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: owner_id,
  });
}

export async function getFlightRequestsByPlanningId(
  planning_id: number,
  owner_id: number,
): Promise<FlightRequest[]> {
  const rows = await prisma.flight_requests.findMany({
    where: { fk_planning_id: planning_id, fk_owner_id: owner_id },
    orderBy: { created_at: 'desc' },
  });
  const names = await clientNameMap(owner_id, rows.map((r) => r.fk_client_id));
  return rows.map((r) => mapFlightRequest(r, names));
}

export interface AssignablePlanning {
  planning_id: number;
  planning_code: string;
  planning_desc: string;
  planning_status: string;
  client_name: string;
  has_valid_drone: boolean;
}

export async function listAssignablePlannings(owner_id: number): Promise<AssignablePlanning[]> {
  const [plannings, missionPlans] = await Promise.all([
    prisma.planning.findMany({
      where: { fk_owner_id: owner_id },
      select: {
        planning_id: true,
        planning_code: true,
        planning_description: true,
        planning_status: true,
        client: { select: { client_name: true } },
      },
      orderBy: { planning_id: 'desc' },
    }),
    prisma.planning_logbook.findMany({
      where: { fk_owner_id: owner_id, fk_tool_id: { not: null } },
      select: { fk_planning_id: true, fk_tool_id: true },
    }),
  ]);

  const toolIds = [...new Set(missionPlans.map((m) => m.fk_tool_id as number))];

  const validToolIds = new Set<number>();
  if (toolIds.length > 0) {
    const components = await prisma.tool_component.findMany({
      where: {
        fk_tool_id: { in: toolIds },
        component_type: 'DRONE',
        component_active: 'Y',
        dcc_drone_id: { not: null },
      },
      select: { fk_tool_id: true },
    });
    components.forEach((c) => validToolIds.add(c.fk_tool_id));
  }

  const validPlanningIds = new Set<number>(
    missionPlans
      .filter((m) => validToolIds.has(m.fk_tool_id as number))
      .map((m) => m.fk_planning_id),
  );

  return plannings.map((p) => ({
    planning_id:     p.planning_id,
    planning_code:   p.planning_code ?? '',
    planning_desc:   p.planning_description ?? '',
    planning_status: p.planning_status ?? '',
    client_name:     p.client?.client_name ?? '',
    has_valid_drone: validPlanningIds.has(p.planning_id),
  }));
}

export interface AssignablePlan {
  mission_planning_id: number;
  mission_planning_code: string | null;
  tool_code: string | null;
  dcc_drone_id: string | null;
}

/**
 * Lists the Mission Planning Logbook entries ("New Mission Planning Entry")
 * directly under a planning — a planning can have one or more of these, each
 * with its own system assignment. Reads planning_logbook only; pilot_mission
 * (the operation-side execution mission) isn't involved at this stage.
 */
export async function listPlansForPlanning(planning_id: number, owner_id: number): Promise<AssignablePlan[]> {
  const plans = await prisma.planning_logbook.findMany({
    where: { fk_planning_id: planning_id, fk_owner_id: owner_id, fk_tool_id: { not: null } },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      fk_tool_id: true,
      tool: { select: { tool_code: true } },
    },
    orderBy: { mission_planning_id: 'asc' },
  });

  const toolIds = [...new Set(plans.map((p) => p.fk_tool_id as number))];

  const droneIdByToolId = new Map<number, string>();
  if (toolIds.length > 0) {
    const components = await prisma.tool_component.findMany({
      where: {
        fk_tool_id: { in: toolIds },
        component_type: 'DRONE',
        component_active: 'Y',
        dcc_drone_id: { not: null },
      },
      orderBy: [{ installation_date: 'desc' }, { created_at: 'desc' }],
      select: { fk_tool_id: true, dcc_drone_id: true },
    });
    for (const c of components) {
      if (!droneIdByToolId.has(c.fk_tool_id) && c.dcc_drone_id) {
        droneIdByToolId.set(c.fk_tool_id, c.dcc_drone_id);
      }
    }
  }

  return plans.map((p) => ({
    mission_planning_id:   p.mission_planning_id,
    mission_planning_code: p.mission_planning_code,
    tool_code:             p.tool?.tool_code ?? null,
    dcc_drone_id:          droneIdByToolId.get(p.fk_tool_id as number) ?? null,
  }));
}

export interface FlightRequestWithPlanning {
  fk_planning_id: number | null;
  fk_pilot_mission_id: number | null;
  dcc_status: string;
  external_mission_id: string | null;
  fk_client_id: number | null;
}

export async function getFlightRequestById(
  request_id: number,
  owner_id: number,
): Promise<FlightRequestWithPlanning | null> {
  const row = await prisma.flight_requests.findFirst({
    where: { request_id, fk_owner_id: owner_id },
    select: { fk_planning_id: true, fk_pilot_mission_id: true, dcc_status: true, external_mission_id: true, fk_client_id: true },
  });
  return row ?? null;
}

/**
 * Mission that flies a request: the mission linked directly via "Link to
 * Mission", else (legacy) the first mission of the planning it was moved to.
 */
export async function resolveMissionIdForRequest(fr: FlightRequestWithPlanning): Promise<number | null> {
  if (fr.fk_pilot_mission_id) return fr.fk_pilot_mission_id;
  if (!fr.fk_planning_id) return null;
  return (await getPilotMissionByPlanningId(fr.fk_planning_id))?.pilot_mission_id ?? null;
}

export async function getPilotMissionByPlanningId(
  planning_id: number,
): Promise<{ pilot_mission_id: number } | null> {
  const row = await prisma.pilot_mission.findFirst({
    where: { fk_planning_id: planning_id },
    orderBy: { pilot_mission_id: 'asc' },
    select: { pilot_mission_id: true },
  });
  return row ?? null;
}

export interface MissionFlightLog {
  log_id: number;
  log_source: string | null;
  original_filename: string | null;
  flytbase_flight_id: string | null;
  uploaded_at: string | null;
}

export async function getMissionFlightLogs(
  mission_id: number,
): Promise<MissionFlightLog[]> {
  const rows = await prisma.mission_flight_logs.findMany({
    where: { fk_mission_id: BigInt(mission_id) },
    select: {
      log_id: true,
      log_source: true,
      original_filename: true,
      flytbase_flight_id: true,
      uploaded_at: true,
    },
    orderBy: { uploaded_at: 'desc' },
  });
  return rows.map((r) => ({
    log_id: Number(r.log_id),
    log_source: r.log_source,
    original_filename: r.original_filename,
    flytbase_flight_id: r.flytbase_flight_id,
    uploaded_at: r.uploaded_at?.toISOString() ?? null,
  }));
}

export async function getLatestFlightLogForMission(
  mission_id: number,
): Promise<{ flytbase_flight_id: string } | null> {
  const row = await prisma.mission_flight_logs.findFirst({
    where: {
      fk_mission_id: BigInt(mission_id),
      flytbase_flight_id: { not: null },
    },
    orderBy: { uploaded_at: 'desc' },
    select: { flytbase_flight_id: true },
  });
  if (!row?.flytbase_flight_id) return null;
  return { flytbase_flight_id: row.flytbase_flight_id };
}

export async function getFlightRequestsByExternalIds(
  external_mission_ids: string[],
  owner_id: number,
  client_id?: number | null,
): Promise<Array<{ request_id: number; external_mission_id: string; dcc_status: string }>> {
  const data = await prisma.flight_requests.findMany({
    where: {
      external_mission_id: { in: external_mission_ids },
      fk_owner_id: owner_id,
      // A client may only see/cancel its own requests.
      fk_client_id: client_id ?? null,
    },
    select: {
      request_id: true,
      external_mission_id: true,
      dcc_status: true,
    },
  })
  return data
}

export async function cancelFlightRequestByExternalId(
  external_mission_id: string,
  owner_id: number,
): Promise<'cancelled' | 'not_found' | 'already_cancelled'> {
  const row = await prisma.flight_requests.findFirst({
    where: { external_mission_id, fk_owner_id: owner_id },
    select: { request_id: true, dcc_status: true },
  });

  if (!row) return 'not_found';
  if (row.dcc_status === 'CANCELLED') return 'already_cancelled';

  await prisma.flight_requests.update({
    where: { request_id: row.request_id },
    data: { dcc_status: 'CANCELLED', updated_at: new Date() },
  });
  return 'cancelled';
}

export async function verifyFlightRequestOwnership(
  request_id: number,
  owner_id: number,
): Promise<boolean> {
  const row = await prisma.flight_requests.findFirst({
    where: { request_id, fk_owner_id: owner_id },
    select: { request_id: true },
  });
  return !!row;
}

export async function deleteFlightRequest(request_id: number, owner_id: number): Promise<void> {
  await prisma.flight_requests.deleteMany({
    where: { request_id, fk_owner_id: owner_id },
  });
}

export async function deleteApiKey(
  api_key_id: number,
  owner_id: number,
  userId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string,
): Promise<void> {
  const existing = await prisma.api_keys.findFirst({
    where: { api_key_id, fk_owner_id: owner_id },
    select: { key_name: true },
  });

  await prisma.flight_requests.updateMany({
    where: { fk_api_key_id: api_key_id },
    data: { fk_api_key_id: null },
  });
  await prisma.api_keys.deleteMany({
    where: { api_key_id, fk_owner_id: owner_id },
  });

  logEvent({
    eventType: 'DELETE',
    entityType: 'api_key',
    entityId: api_key_id,
    description: `API key '${existing?.key_name ?? `#${api_key_id}`}' deleted`,
    userId: userId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: owner_id,
  });
}
