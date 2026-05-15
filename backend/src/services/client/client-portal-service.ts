import { supabase } from '@/backend/database/database';

export interface ClientPortalDashboard {
  total_missions: number;
  planned: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total_flight_hours: number;
  total_distance_km: number;
  systems_used: { tool_id: number; tool_code: string; tool_name: string | null; mission_count: number }[];
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
  const planningIds = await getClientPlanningIds(clientId, ownerId);

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

  return {
    total_missions: rows.length,
    planned,
    in_progress,
    completed,
    cancelled,
    total_flight_hours: Math.round((total_flight_minutes / 60) * 10) / 10,
    total_distance_km: Math.round((total_distance_m / 1000) * 10) / 10,
    systems_used: Array.from(toolMap.values()).sort((a, b) => b.mission_count - a.mission_count),
  };
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
