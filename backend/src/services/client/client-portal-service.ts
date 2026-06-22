import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export interface ClientInfo {
  client_name: string;
  client_legal_name: string | null;
  client_code: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_website: string | null;
  client_city: string | null;
  client_state: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
}

export interface ClientPortalDashboard {
  total_missions: number;
  planned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_flight_hours: number;
  total_distance_km: number;
  systems_used: { tool_id: number; tool_code: string; tool_name: string | null; mission_count: number }[];
  client_info: ClientInfo | null;
}

export interface ClientPortalMission {
  pilot_mission_id: number;
  mission_code: string;
  mission_name: string | null;
  status_name: string | null;
  scheduled_start: string | null;
  actual_start: string | null;
  actual_end: string | null;
  flight_duration: number | null;
  location: string | null;
  distance_flown: number | null;
  notes: string | null;
  pilot_name: string | null;
  tool_code: string | null;
  tool_name: string | null;
  created_at: string;
}

export interface ClientPortalMissionsResponse {
  data: ClientPortalMission[];
  total: number;
  page: number;
  pageSize: number;
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function asUtc(ts: string | Date | null | undefined): string | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts.toISOString();
  return ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
}

async function getClientPlanningIds(clientId: number, ownerId: number): Promise<number[]> {
  const rows = await prisma.planning.findMany({
    where: { fk_owner_id: ownerId, fk_client_id: clientId },
    select: { planning_id: true },
  });
  return rows.map((p) => p.planning_id);
}

export async function getClientPortalDashboard(
  clientId: number,
  ownerId: number,
): Promise<ClientPortalDashboard> {
  const [planningIds, clientRow] = await Promise.all([
    getClientPlanningIds(clientId, ownerId),
    prisma.client.findFirst({
      where: { client_id: clientId, fk_owner_id: ownerId },
      select: {
        client_name: true,
        client_legal_name: true,
        client_code: true,
        client_email: true,
        client_phone: true,
        client_website: true,
        client_city: true,
        client_state: true,
        contract_start_date: true,
        contract_end_date: true,
      },
    }),
  ]);

  const missionWhere: any = { fk_owner_id: ownerId };
  if (planningIds.length > 0) {
    missionWhere.OR = [
      { fk_client_id: clientId },
      { fk_planning_id: { in: planningIds } },
    ];
  } else {
    missionWhere.fk_client_id = clientId;
  }

  const rows = await prisma.pilot_mission.findMany({
    where: missionWhere,
    select: {
      status_name: true,
      flight_duration: true,
      distance_flown: true,
      fk_tool_id: true,
      tool: { select: { tool_id: true, tool_code: true, tool_name: true } },
    },
  });

  let planned = 0, in_progress = 0, completed = 0, cancelled = 0;
  let total_flight_minutes = 0;
  let total_distance_m = 0;

  const toolMap = new Map<number, { tool_id: number; tool_code: string; tool_name: string | null; mission_count: number }>();

  for (const row of rows) {
    const status = (row.status_name ?? '').toUpperCase();
    if (status === 'PLANNED') planned++;
    else if (status === 'IN_PROGRESS' || status === 'IN PROGRESS') in_progress++;
    else if (status === 'COMPLETED') completed++;
    else if (status === 'CANCELLED' || status === 'ABORTED') cancelled++;

    total_flight_minutes += row.flight_duration ?? 0;
    total_distance_m += row.distance_flown ? Number(row.distance_flown) : 0;

    if (row.fk_tool_id && row.tool) {
      const existing = toolMap.get(row.fk_tool_id);
      if (existing) {
        existing.mission_count++;
      } else {
        toolMap.set(row.fk_tool_id, {
          tool_id: row.tool.tool_id,
          tool_code: row.tool.tool_code ?? '',
          tool_name: row.tool.tool_name ?? null,
          mission_count: 1,
        });
      }
    }
  }

  const client_info: ClientInfo | null = clientRow ? {
    client_name: clientRow.client_name,
    client_legal_name: clientRow.client_legal_name ?? null,
    client_code: clientRow.client_code ?? null,
    client_email: clientRow.client_email ?? null,
    client_phone: clientRow.client_phone ?? null,
    client_website: clientRow.client_website ?? null,
    client_city: clientRow.client_city ?? null,
    client_state: clientRow.client_state ?? null,
    contract_start_date: clientRow.contract_start_date ? localDateStr(clientRow.contract_start_date) : null,
    contract_end_date: clientRow.contract_end_date ? localDateStr(clientRow.contract_end_date) : null,
  } : null;

  return {
    total_missions: rows.length,
    planned,
    in_progress,
    completed,
    cancelled,
    total_flight_hours: Math.round((total_flight_minutes / 60) * 10) / 10,
    total_distance_km: Math.round((total_distance_m / 1000) * 10) / 10,
    systems_used: Array.from(toolMap.values()).sort((a, b) => b.mission_count - a.mission_count),
    client_info,
  };
}

export interface ClientPortalAnalytics {
  daily_flights: { date: string; count: number }[];
  monthly_stats: { month: string; flights: number; hours: number; distance_km: number }[];
}

export async function getClientPortalAnalytics(
  clientId: number,
  ownerId: number,
): Promise<ClientPortalAnalytics> {
  const planningIds = await getClientPlanningIds(clientId, ownerId);

  const missionWhere: any = { fk_owner_id: ownerId };
  if (planningIds.length > 0) {
    missionWhere.OR = [
      { fk_client_id: clientId },
      { fk_planning_id: { in: planningIds } },
    ];
  } else {
    missionWhere.fk_client_id = clientId;
  }

  const rows = await prisma.pilot_mission.findMany({
    where: missionWhere,
    select: {
      scheduled_start: true,
      actual_start: true,
      flight_duration: true,
      distance_flown: true,
    },
  });

  // Build daily flight counts (last 365 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyMap = new Map<string, number>();

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dailyMap.set(localDateStr(d), 0);
  }

  // Build monthly stats (last 12 months)
  const monthlyMap = new Map<string, { flights: number; minutes: number; distance_m: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { flights: 0, minutes: 0, distance_m: 0 });
  }

  for (const row of rows) {
    const ts = row.actual_start ?? row.scheduled_start;
    const dateStr = ts ? localDateStr(ts) : '';
    if (dateStr && dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + 1);
    }
    const monthKey = dateStr.slice(0, 7);
    if (monthKey && monthlyMap.has(monthKey)) {
      const m = monthlyMap.get(monthKey)!;
      m.flights++;
      m.minutes += row.flight_duration ?? 0;
      m.distance_m += row.distance_flown ? Number(row.distance_flown) : 0;
    }
  }

  return {
    daily_flights: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
    monthly_stats: Array.from(monthlyMap.entries()).map(([month, v]) => ({
      month,
      flights: v.flights,
      hours: Math.round((v.minutes / 60) * 10) / 10,
      distance_km: Math.round((v.distance_m / 1000) * 10) / 10,
    })),
  };
}

export interface CreateClientPortalRequestInput {
  owner_id: number;
  client_id: number;
  mission_type?: string;
  target?: string;
  start_datetime?: string;
  priority?: string;
  notes?: string;
  operator?: string;
  localization?: Record<string, unknown>;
  waypoint?: Record<string, unknown>;
}

export async function createClientPortalFlightRequest(
  input: CreateClientPortalRequestInput,
): Promise<{ request_id: number }> {
  const external_mission_id = `CLIENT-${input.client_id}-${randomUUID().slice(0, 8).toUpperCase()}`;

  const record = await prisma.flight_requests.create({
    data: {
      fk_owner_id: input.owner_id,
      fk_api_key_id: null,
      external_mission_id,
      mission_type: input.mission_type ?? null,
      target: input.target ?? null,
      start_datetime: input.start_datetime ? new Date(input.start_datetime) : null,
      priority: input.priority ?? null,
      notes: input.notes ?? null,
      operator: input.operator ?? null,
      localization: (input.localization ?? null) as any,
      waypoint: (input.waypoint ?? null) as any,
      dcc_status: 'NEW',
    },
    select: { request_id: true },
  });

  return { request_id: record.request_id };
}

export async function listClientPortalMissions(
  clientId: number,
  ownerId: number,
  params: { page: number; pageSize: number; search?: string; status?: string },
): Promise<ClientPortalMissionsResponse> {
  const { page, pageSize, search, status } = params;
  const skip = (page - 1) * pageSize;

  const planningIds = await getClientPlanningIds(clientId, ownerId);

  const conditions: any[] = [];
  if (planningIds.length > 0) {
    conditions.push({
      OR: [
        { fk_client_id: clientId },
        { fk_planning_id: { in: planningIds } },
      ],
    });
  } else {
    conditions.push({ fk_client_id: clientId });
  }
  if (status) conditions.push({ status_name: status });
  if (search) {
    conditions.push({
      OR: [
        { mission_code: { contains: search, mode: 'insensitive' } },
        { mission_name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  const missionWhere = { fk_owner_id: ownerId, AND: conditions };

  const [rows, total] = await Promise.all([
    prisma.pilot_mission.findMany({
      where: missionWhere,
      select: {
        pilot_mission_id: true,
        mission_code: true,
        mission_name: true,
        status_name: true,
        scheduled_start: true,
        actual_start: true,
        actual_end: true,
        flight_duration: true,
        location: true,
        distance_flown: true,
        notes: true,
        created_at: true,
        users: { select: { first_name: true, last_name: true } },
        tool: { select: { tool_code: true, tool_name: true } },
      },
      skip,
      take: pageSize,
      orderBy: { created_at: 'desc' },
    }),
    prisma.pilot_mission.count({ where: missionWhere }),
  ]);

  const missions: ClientPortalMission[] = rows.map((row) => ({
    pilot_mission_id: row.pilot_mission_id,
    mission_code: row.mission_code ?? '',
    mission_name: row.mission_name ?? null,
    status_name: row.status_name ?? null,
    scheduled_start: asUtc(row.scheduled_start),
    actual_start: asUtc(row.actual_start),
    actual_end: asUtc(row.actual_end),
    flight_duration: row.flight_duration ?? null,
    location: row.location ?? null,
    distance_flown: row.distance_flown ? Number(row.distance_flown) : null,
    notes: row.notes ?? null,
    pilot_name: row.users
      ? `${row.users.first_name ?? ''} ${row.users.last_name ?? ''}`.trim()
      : null,
    tool_code: row.tool?.tool_code ?? null,
    tool_name: row.tool?.tool_name ?? null,
    created_at: row.created_at?.toISOString() ?? '',
  }));

  return { data: missions, total, page, pageSize };
}
