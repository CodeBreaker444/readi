import { supabase } from '@/backend/database/database';
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

function asUtc(ts: string | null | undefined): string | null {
  if (!ts) return null;
  return ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
}

async function getClientPlanningIds(clientId: number, ownerId: number): Promise<number[]> {
  const { data } = await supabase
    .from('planning')
    .select('planning_id')
    .eq('fk_owner_id', ownerId)
    .eq('fk_client_id', clientId);
  return (data ?? []).map((p: any) => p.planning_id);
}

export async function getClientPortalDashboard(
  clientId: number,
  ownerId: number,
): Promise<ClientPortalDashboard> {
  const [planningIds, clientResult] = await Promise.all([
    getClientPlanningIds(clientId, ownerId),
    supabase
      .from('client')
      .select('client_name, client_legal_name, client_code, client_email, client_phone, client_website, client_city, client_state, contract_start_date, contract_end_date')
      .eq('client_id', clientId)
      .eq('fk_owner_id', ownerId)
      .single(),
  ]);

  let query = supabase
    .from('pilot_mission')
    .select(
      `
      pilot_mission_id,
      status_name,
      flight_duration,
      distance_flown,
      fk_tool_id,
      tool:tool!fk_tool_id ( tool_id, tool_code, tool_name )
    `,
    )
    .eq('fk_owner_id', ownerId);

  // Missions belonging to this client: either tagged directly OR via their planning
  if (planningIds.length > 0) {
    query = query.or(
      `fk_client_id.eq.${clientId},fk_planning_id.in.(${planningIds.join(',')})`,
    );
  } else {
    query = query.eq('fk_client_id', clientId);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch client dashboard: ${error.message}`);

  const rows = data ?? [];

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
    total_distance_m += row.distance_flown ?? 0;

    if (row.fk_tool_id && row.tool) {
      const t = Array.isArray(row.tool) ? row.tool[0] : row.tool;
      if (t) {
        const existing = toolMap.get(row.fk_tool_id);
        if (existing) {
          existing.mission_count++;
        } else {
          toolMap.set(row.fk_tool_id, {
            tool_id: t.tool_id,
            tool_code: t.tool_code,
            tool_name: t.tool_name ?? null,
            mission_count: 1,
          });
        }
      }
    }
  }

  const ci = clientResult.data;
  const client_info: ClientInfo | null = ci ? {
    client_name: ci.client_name,
    client_legal_name: ci.client_legal_name ?? null,
    client_code: ci.client_code ?? null,
    client_email: ci.client_email ?? null,
    client_phone: ci.client_phone ?? null,
    client_website: ci.client_website ?? null,
    client_city: ci.client_city ?? null,
    client_state: ci.client_state ?? null,
    contract_start_date: ci.contract_start_date ?? null,
    contract_end_date: ci.contract_end_date ?? null,
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

  let query = supabase
    .from('pilot_mission')
    .select('scheduled_start, actual_start, flight_duration, distance_flown')
    .eq('fk_owner_id', ownerId);

  if (planningIds.length > 0) {
    query = query.or(
      `fk_client_id.eq.${clientId},fk_planning_id.in.(${planningIds.join(',')})`,
    );
  } else {
    query = query.eq('fk_client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch analytics: ${error.message}`);

  const rows = data ?? [];

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
    const dateStr = (row.actual_start ?? row.scheduled_start ?? '').slice(0, 10);
    if (dailyMap.has(dateStr)) {
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + 1);
    }
    const monthKey = dateStr.slice(0, 7);
    if (monthlyMap.has(monthKey)) {
      const m = monthlyMap.get(monthKey)!;
      m.flights++;
      m.minutes += row.flight_duration ?? 0;
      m.distance_m += row.distance_flown ?? 0;
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

  const { data, error } = await supabase
    .from('flight_requests')
    .insert({
      fk_owner_id: input.owner_id,
      fk_api_key_id: null,
      external_mission_id,
      mission_type: input.mission_type ?? null,
      target: input.target ?? null,
      start_datetime: input.start_datetime ?? null,
      priority: input.priority ?? null,
      notes: input.notes ?? null,
      operator: input.operator ?? null,
      localization: input.localization ?? null,
      waypoint: input.waypoint ?? null,
      dcc_status: 'NEW',
    })
    .select('request_id')
    .single();

  if (error || !data) throw new Error(`createClientPortalFlightRequest: ${error?.message}`);
  return { request_id: data.request_id };
}

export async function listClientPortalMissions(
  clientId: number,
  ownerId: number,
  params: { page: number; pageSize: number; search?: string; status?: string },
): Promise<ClientPortalMissionsResponse> {
  const { page, pageSize, search, status } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const planningIds = await getClientPlanningIds(clientId, ownerId);

  let query = supabase
    .from('pilot_mission')
    .select(
      `
      pilot_mission_id,
      mission_code,
      mission_name,
      status_name,
      scheduled_start,
      actual_start,
      actual_end,
      flight_duration,
      location,
      distance_flown,
      notes,
      created_at,
      pilot:users!fk_pilot_user_id ( first_name, last_name ),
      tool:tool!fk_tool_id ( tool_code, tool_name )
    `,
      { count: 'exact' },
    )
    .eq('fk_owner_id', ownerId)
    .range(from, to)
    .order('created_at', { ascending: false });

  if (planningIds.length > 0) {
    query = query.or(
      `fk_client_id.eq.${clientId},fk_planning_id.in.(${planningIds.join(',')})`,
    );
  } else {
    query = query.eq('fk_client_id', clientId);
  }

  if (status) query = query.eq('status_name', status);
  if (search) {
    query = query.or(
      `mission_code.ilike.%${search}%,mission_name.ilike.%${search}%,location.ilike.%${search}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list client missions: ${error.message}`);

  const missions: ClientPortalMission[] = (data ?? []).map((row: any) => {
    const pilot = Array.isArray(row.pilot) ? row.pilot[0] : row.pilot;
    const tool = Array.isArray(row.tool) ? row.tool[0] : row.tool;
    return {
      pilot_mission_id: row.pilot_mission_id,
      mission_code: row.mission_code,
      mission_name: row.mission_name ?? null,
      status_name: row.status_name ?? null,
      scheduled_start: asUtc(row.scheduled_start),
      actual_start: asUtc(row.actual_start),
      actual_end: asUtc(row.actual_end),
      flight_duration: row.flight_duration ?? null,
      location: row.location ?? null,
      distance_flown: row.distance_flown ?? null,
      notes: row.notes ?? null,
      pilot_name: pilot ? `${pilot.first_name ?? ''} ${pilot.last_name ?? ''}`.trim() : null,
      tool_code: tool?.tool_code ?? null,
      tool_name: tool?.tool_name ?? null,
      created_at: row.created_at,
    };
  });

  return { data: missions, total: count ?? 0, page, pageSize };
}
