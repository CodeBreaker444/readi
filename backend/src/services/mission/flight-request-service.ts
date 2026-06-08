import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export interface CreateFlightRequestInput {
  owner_id: number;
  api_key_id: number;
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
}

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
}): FlightRequest {
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
  };
}

export async function flightRequestExists(
  external_mission_id: string,
  owner_id: number,
): Promise<boolean> {
  const row = await prisma.flight_requests.findFirst({
    where: { external_mission_id, fk_owner_id: owner_id },
    select: { request_id: true },
  });
  return !!row;
}

export async function createFlightRequest(input: CreateFlightRequestInput): Promise<{ request_id: number }> {
  const row = await prisma.flight_requests.create({
    data: {
      fk_owner_id:         input.owner_id,
      fk_api_key_id:       input.api_key_id,
      external_mission_id: input.external_mission_id,
      mission_type:        input.mission_type ?? null,
      target:              input.target ?? null,
      localization:        input.localization ? (input.localization as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      waypoint:            input.waypoint ? (input.waypoint as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      start_datetime:      input.start_datetime ? new Date(input.start_datetime) : null,
      priority:            input.priority ?? null,
      notes:               input.notes ?? null,
      operator:            input.operator ?? null,
      dcc_status:          'NEW',
    },
    select: { request_id: true },
  });
  return { request_id: row.request_id };
}

export async function listFlightRequests(owner_id: number, status?: string): Promise<FlightRequest[]> {
  const rows = await prisma.flight_requests.findMany({
    where: {
      fk_owner_id: owner_id,
      ...(status && status !== 'ALL' ? { dcc_status: status } : {}),
    },
    orderBy: { created_at: 'desc' },
  });
  return rows.map(mapFlightRequest);
}

export async function assignFlightRequest(
  request_id: number,
  owner_id: number,
  assigned_by_user_id: number,
  planning_id?: number,
): Promise<void> {
  await prisma.flight_requests.updateMany({
    where: { request_id, fk_owner_id: owner_id },
    data: {
      dcc_status:          planning_id ? 'ASSIGNED' : 'ACKNOWLEDGED',
      fk_planning_id:      planning_id ?? null,
      assigned_by_user_id,
      assigned_at:         new Date(),
      updated_at:          new Date(),
    },
  });
}

export async function updateFlightRequestStatus(
  request_id: number,
  owner_id: number,
  dcc_status: string,
): Promise<void> {
  await prisma.flight_requests.updateMany({
    where: { request_id, fk_owner_id: owner_id },
    data: { dcc_status, updated_at: new Date() },
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
      is_active: true,
      last_used_at: true,
      expires_at: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
  return rows.map((r) => ({
    api_key_id: r.api_key_id,
    key_name: r.key_name,
    key_prefix: r.key_prefix,
    key_scope: r.key_scope,
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
): Promise<{ api_key_id: number; key_value: string }> {
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
      is_active:           true,
      created_by_user_id,
      expires_at:          expires_at ? new Date(expires_at) : null,
    },
    select: { api_key_id: true },
  });
  return { api_key_id: row.api_key_id, key_value: rawKey };
}

export async function revokeApiKey(api_key_id: number, owner_id: number): Promise<void> {
  await prisma.api_keys.updateMany({
    where: { api_key_id, fk_owner_id: owner_id },
    data: { is_active: false },
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
  return rows.map(mapFlightRequest);
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
  const [plannings, missions] = await Promise.all([
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
    prisma.pilot_mission.findMany({
      where: {
        fk_owner_id: owner_id,
        fk_planning_id: { not: null },
        fk_tool_id: { not: null },
      },
      select: { fk_planning_id: true, fk_tool_id: true },
    }),
  ]);

  const toolIds = [...new Set(missions.map((m) => m.fk_tool_id as number))];

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
    missions
      .filter((m) => validToolIds.has(m.fk_tool_id as number))
      .map((m) => m.fk_planning_id as number),
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

export interface FlightRequestWithPlanning {
  fk_planning_id: number | null;
  dcc_status: string;
  external_mission_id: string | null;
}

export async function getFlightRequestById(
  request_id: number,
  owner_id: number,
): Promise<FlightRequestWithPlanning | null> {
  const row = await prisma.flight_requests.findFirst({
    where: { request_id, fk_owner_id: owner_id },
    select: { fk_planning_id: true, dcc_status: true, external_mission_id: true },
  });
  return row ?? null;
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

export async function deleteApiKey(api_key_id: number, owner_id: number): Promise<void> {
  await prisma.api_keys.deleteMany({
    where: { api_key_id, fk_owner_id: owner_id },
  });
}
