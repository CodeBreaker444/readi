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

export async function deleteApiKey(api_key_id: number, owner_id: number): Promise<void> {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('api_key_id', api_key_id)
    .eq('fk_owner_id', owner_id);

  if (error) throw new Error(`deleteApiKey: ${error.message}`);
}
