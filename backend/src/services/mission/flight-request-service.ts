import { supabase } from '@/backend/database/database';
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


export async function flightRequestExists(
  external_mission_id: string,
  owner_id: number,
): Promise<boolean> {
  const { data } = await supabase
    .from('flight_requests')
    .select('request_id')
    .eq('external_mission_id', external_mission_id)
    .eq('fk_owner_id', owner_id)
    .limit(1)
    .single();

  return !!data;
}

export async function createFlightRequest(input: CreateFlightRequestInput): Promise<{ request_id: number }> {
  const { data, error } = await supabase
    .from('flight_requests')
    .insert({
      fk_owner_id:         input.owner_id,
      fk_api_key_id:       input.api_key_id,
      external_mission_id: input.external_mission_id,
      mission_type:        input.mission_type ?? null,
      target:              input.target ?? null,
      localization:        input.localization ?? null,
      waypoint:            input.waypoint ?? null,
      start_datetime:      input.start_datetime ?? null,
      priority:            input.priority ?? null,
      notes:               input.notes ?? null,
      operator:            input.operator ?? null,
      dcc_status:          'NEW',
    })
    .select('request_id')
    .single();

  if (error || !data) throw new Error(`createFlightRequest: ${error?.message}`);
  return { request_id: data.request_id };
}

export async function listFlightRequests(owner_id: number, status?: string): Promise<FlightRequest[]> {
  let query = supabase
    .from('flight_requests')
    .select('*')
    .eq('fk_owner_id', owner_id)
    .order('created_at', { ascending: false });

  if (status && status !== 'ALL') {
    query = query.eq('dcc_status', status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`listFlightRequests: ${error.message}`);
  return (data ?? []) as FlightRequest[];
}

export async function assignFlightRequest(
  request_id: number,
  owner_id: number,
  assigned_by_user_id: number,
  planning_id?: number,
): Promise<void> {
  const { error } = await supabase
    .from('flight_requests')
    .update({
      dcc_status:          planning_id ? 'ASSIGNED' : 'ACKNOWLEDGED',
      fk_planning_id:      planning_id ?? null,
      assigned_by_user_id,
      assigned_at:         new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    })
    .eq('request_id', request_id)
    .eq('fk_owner_id', owner_id);

  if (error) throw new Error(`assignFlightRequest: ${error.message}`);
}

export async function updateFlightRequestStatus(
  request_id: number,
  owner_id: number,
  dcc_status: string,
): Promise<void> {
  const { error } = await supabase
    .from('flight_requests')
    .update({ dcc_status, updated_at: new Date().toISOString() })
    .eq('request_id', request_id)
    .eq('fk_owner_id', owner_id);

  if (error) throw new Error(`updateFlightRequestStatus: ${error.message}`);
}


export async function listApiKeys(owner_id: number) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('api_key_id, key_name, key_prefix, key_scope, is_active, last_used_at, expires_at, created_at')
    .eq('fk_owner_id', owner_id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`listApiKeys: ${error.message}`);
  return data ?? [];
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

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      fk_owner_id:         owner_id,
      key_name,
      key_value:           keyHash,
      key_prefix:          prefix,
      key_scope:           'mission_request',
      is_active:           true,
      created_by_user_id,
      expires_at:          expires_at ?? null,
    })
    .select('api_key_id')
    .single();

  if (error || !data) throw new Error(`createApiKey: ${error?.message}`);
  return { api_key_id: data.api_key_id, key_value: rawKey };
}

export async function revokeApiKey(api_key_id: number, owner_id: number): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('api_key_id', api_key_id)
    .eq('fk_owner_id', owner_id);

  if (error) throw new Error(`revokeApiKey: ${error.message}`);
}

export async function getFlightRequestsByPlanningId(
  planning_id: number,
  owner_id: number,
): Promise<FlightRequest[]> {
  const { data, error } = await supabase
    .from('flight_requests')
    .select('*')
    .eq('fk_planning_id', planning_id)
    .eq('fk_owner_id', owner_id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getFlightRequestsByPlanningId: ${error.message}`);
  return (data ?? []) as FlightRequest[];
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
  const { data: plannings, error: pe } = await supabase
    .from('planning')
    .select('planning_id, planning_code, planning_description, planning_status, client:fk_client_id(client_name)')
    .eq('fk_owner_id', owner_id)
    .order('planning_id', { ascending: false });
  if (pe) throw new Error(`listAssignablePlannings (plannings): ${pe.message}`);

  // Pilot missions that have a tool and belong to a planning
  const { data: missions, error: me } = await supabase
    .from('pilot_mission')
    .select('fk_planning_id, fk_tool_id')
    .eq('fk_owner_id', owner_id)
    .not('fk_planning_id', 'is', null)
    .not('fk_tool_id', 'is', null);
  if (me) throw new Error(`listAssignablePlannings (missions): ${me.message}`);

  //  Tool IDs from those missions
  const toolIds = [...new Set((missions ?? []).map((m: any) => m.fk_tool_id as number))];

  //. DRONE components with dcc_drone_id set, for those tools
  const validToolIds = new Set<number>();
  if (toolIds.length > 0) {
    const { data: components } = await supabase
      .from('tool_component')
      .select('fk_tool_id')
      .in('fk_tool_id', toolIds)
      .eq('component_type', 'DRONE')
      .eq('component_active', 'Y')
      .not('dcc_drone_id', 'is', null);
    (components ?? []).forEach((c: any) => validToolIds.add(c.fk_tool_id as number));
  }

  // Planning IDs that have at least one mission with a valid drone
  const validPlanningIds = new Set<number>(
    (missions ?? [])
      .filter((m: any) => validToolIds.has(m.fk_tool_id as number))
      .map((m: any) => m.fk_planning_id as number),
  );

  return (plannings ?? []).map((p: any) => {
    const client = Array.isArray(p.client) ? p.client[0] : p.client;
    return {
      planning_id:     p.planning_id,
      planning_code:   p.planning_code ?? '',
      planning_desc:   p.planning_description ?? '',
      planning_status: p.planning_status ?? '',
      client_name:     client?.client_name ?? '',
      has_valid_drone: validPlanningIds.has(p.planning_id),
    };
  });
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
  const { data } = await supabase
    .from('flight_requests')
    .select('fk_planning_id, dcc_status, external_mission_id')
    .eq('request_id', request_id)
    .eq('fk_owner_id', owner_id)
    .single();

  return data ?? null;
}

export async function getPilotMissionByPlanningId(
  planning_id: number,
): Promise<{ pilot_mission_id: number } | null> {
  const { data } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id')
    .eq('fk_planning_id', planning_id)
    .order('pilot_mission_id', { ascending: true })
    .limit(1)
    .single();

  return data ?? null;
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
  const { data, error } = await supabase
    .from('mission_flight_logs')
    .select('log_id, log_source, original_filename, flytbase_flight_id, uploaded_at')
    .eq('fk_mission_id', mission_id)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(`getMissionFlightLogs: ${error.message}`);
  return data ?? [];
}

export async function getLatestFlightLogForMission(
  mission_id: number,
): Promise<{ flytbase_flight_id: string } | null> {
  const { data } = await supabase
    .from('mission_flight_logs')
    .select('flytbase_flight_id')
    .eq('fk_mission_id', mission_id)
    .not('flytbase_flight_id', 'is', null)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  return data ?? null;
}

export async function deleteApiKey(api_key_id: number, owner_id: number): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('api_key_id', api_key_id)
    .eq('fk_owner_id', owner_id);

  if (error) throw new Error(`deleteApiKey: ${error.message}`);
}
