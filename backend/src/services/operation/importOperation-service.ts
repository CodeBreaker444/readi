import { supabase } from '@/backend/database/database';
import JSZip from 'jszip';


export interface ImportMissionParams {
  ownerId: number;
  clientId: number;
  platform: string;
  vehicleId: number;
  categoryId: number;
  typeId: number;
  planId: number | null;
  statusId: number;      
  resultId: number;
  pilotId: number;
  groupLabel: string;
  notes: string;
  location: string;          
}

export interface ImportMissionResult {
  newMissionIds: number[];
  operations: any[];
  skipped: string[];      
}

interface GutmaRoot {
  flight_logging?: {
    flight_id?: string;
    start_dtg?: string;
    end_dtg?: string;
    logging_start_dtg?: string;
    max_altitude_agl?: number;
    total_distance?: number;
    [key: string]: any;
  };
  flight?: {
    flight_id?: string;
    takeoff_time?: string;
    landing_time?: string;
    max_altitude?: number;
    flight_distance?: number;
    [key: string]: any;
  };
  gcs_info?: {
    registration_id?: string;
    [key: string]: any;
  };
  [key: string]: any;
}


function extractMissionCodeFromFilename(filename: string): string | null {
  const pattern =
    /^(.*?)_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?:_.*)?\.[A-Za-z0-9]+$/;
  const match = filename.match(pattern);
  return match ? match[1].trim() : null;
}

function parseDurationSeconds(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return isNaN(ms) || ms < 0 ? null : Math.round(ms / 1000);
}

function resolveTimes(parsed: GutmaRoot): { takeoff: string | null; landing: string | null } {
  return {
    takeoff:
      parsed.flight_logging?.start_dtg ??
      parsed.flight_logging?.logging_start_dtg ??
      parsed.flight?.takeoff_time ??
      null,
    landing:
      parsed.flight_logging?.end_dtg ??
      parsed.flight?.landing_time ??
      null,
  };
}

function resolveMissionCode(parsed: GutmaRoot, filename: string): string {
  return (
    extractMissionCodeFromFilename(filename) ??
    parsed.flight_logging?.flight_id ??
    parsed.flight?.flight_id ??
    parsed.gcs_info?.registration_id ??
    `IMPORT-${Date.now()}`
  );
}


async function processGutmaBuffer(
  buffer: ArrayBuffer,
  filename: string,
  params: ImportMissionParams
): Promise<{ missionId: number; operation: any } | { error: string; duplicate?: boolean }> {

  let parsed: GutmaRoot;
  try {
    parsed = JSON.parse(new TextDecoder().decode(buffer));
  } catch (e) {
    return { error: `Failed to parse JSON in "${filename}": ${(e as Error).message}` };
  }

  const missionCode    = resolveMissionCode(parsed, filename);
  const { takeoff, landing } = resolveTimes(parsed);
  const durationSec    = parseDurationSeconds(takeoff, landing);
  const maxAltitude    = parsed.flight?.max_altitude    ?? parsed.flight_logging?.max_altitude_agl  ?? null;
  const distanceFlown  = parsed.flight?.flight_distance ?? parsed.flight_logging?.total_distance    ?? null;

  const { data: existing } = await supabase
    .from('pilot_mission')
    .select('pilot_mission_id')
    .eq('mission_code', missionCode)
    .eq('fk_owner_id', params.ownerId)
    .maybeSingle();

  if (existing) {
    return {
      duplicate: true,
      error: `Duplicate mission_code "${missionCode}" — skipped`,
    };
  }

  let statusName: string | null = null;
  if (params.statusId) {
    const { data: st } = await supabase
      .from('pilot_mission_status')
      .select('status_name')
      .eq('status_id', params.statusId)
      .single();
    statusName = st?.status_name ?? null;
  }

  const notesArr = [
    params.notes      || null,
    params.groupLabel ? `Group: ${params.groupLabel}` : null,
    `Platform: ${params.platform}`,
    `Source: ${filename}`,
  ].filter(Boolean);

  const insertPayload: Record<string, any> = {
    fk_owner_id:             params.ownerId,
    fk_pilot_user_id:        params.pilotId    || null,
    fk_tool_id:              params.vehicleId  || null,
    fk_planning_id:          params.planId     || null,
    fk_mission_type_id:      params.typeId     || null,
    fk_mission_category_id:  params.categoryId || null,
    fk_mission_status_id:    params.statusId   || null,
    mission_code:            missionCode,
    mission_name:            missionCode,
    status_name:             statusName,           
    location:                params.location || null,  
    mission_description:     params.notes    || null,
    scheduled_start:         takeoff,
    actual_start:            takeoff,
    actual_end:              landing,
    flight_duration:         durationSec,
    max_altitude:            maxAltitude,
    distance_flown:          distanceFlown,
    notes:                   notesArr.join(' | ') || null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('pilot_mission')
    .insert(insertPayload)
    .select('pilot_mission_id')
    .single();

  if (insertError) {
    return { error: `DB insert failed for "${filename}": ${insertError.message}` };
  }

  const { data: full } = await supabase
    .from('pilot_mission')
    .select(`
      pilot_mission_id,
      mission_code,
      mission_name,
      status_name,
      scheduled_start,
      location,
      notes,
      pilot:users!fk_pilot_user_id ( first_name, last_name ),
      tool:tool!fk_tool_id ( tool_code )
    `)
    .eq('pilot_mission_id', inserted.pilot_mission_id)
    .single();

  const operation = full ? {
    ...full,
    pilot_name: full.pilot
      ? `${(full.pilot as any).first_name ?? ''} ${(full.pilot as any).last_name ?? ''}`.trim()
      : null,
    tool_code: (full.tool as any)?.tool_code ?? null,
  } : null;

  return { missionId: inserted.pilot_mission_id, operation };
}


export async function importMissionFromLog(
  file: File,
  params: ImportMissionParams
): Promise<ImportMissionResult> {
  const buffer = await file.arrayBuffer();
  const ext    = file.name.split('.').pop()?.toLowerCase();

  const successes: Array<{ missionId: number; operation: any }> = [];
  const errors: string[]    = [];
  const duplicates: string[] = [];

  if (ext === 'gutma') {
    const res = await processGutmaBuffer(buffer, file.name, params);
    if ('error' in res) {
      if (res.duplicate) duplicates.push(res.error);
      else errors.push(res.error);
    } else {
      successes.push(res);
    }

  } else if (ext === 'zip') {
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (e) {
      throw new Error(`Failed to open ZIP: ${(e as Error).message}`);
    }

    const gutmaEntries = Object.entries(zip.files).filter(
      ([name, entry]) => !entry.dir && name.split('.').pop()?.toLowerCase() === 'gutma'
    );

    if (gutmaEntries.length === 0) throw new Error('ZIP contains no .gutma files.');

    for (const [name, entry] of gutmaEntries) {
      const buf = await entry.async('arraybuffer');
      const res = await processGutmaBuffer(buf, name.split('/').pop() ?? name, params);
      if ('error' in res) {
        if (res.duplicate) duplicates.push(res.error);
        else errors.push(res.error);
      } else {
        successes.push(res);
      }
    }
  } else {
    throw new Error(`Unsupported file extension: .${ext}`);
  }

  if (successes.length === 0 && errors.length > 0) {
    throw new Error(`No missions imported.\n• ${errors.join('\n• ')}`);
  }

  return {
    newMissionIds: successes.map((r) => r.missionId),
    operations:    successes.map((r) => r.operation).filter(Boolean),
    skipped:       duplicates,
  };
}


export async function importClinets(ownerId: number) {
    const { data, error } = await supabase
        .from('client')
        .select('client_id, client_name, client_code')
        .eq('fk_owner_id', ownerId)
        .eq('client_active', 'Y')
        .order('client_name');
    if (error) throw error;

    return data
}
export async function importDrones(ownerId: number) {
    let query = supabase
        .from('tool')
        .select('tool_id, tool_code, tool_name')
        .eq('fk_owner_id', ownerId)
        .eq('tool_active', 'Y')
        .order('tool_code');
    const { data, error } = await query;
    if (error) throw error;

    return data
}

export async function importPlans(ownerId: number, clientId?: number, vehicleId?: number) {
    let query = supabase
        .from('planning_logbook')
        .select('mission_planning_id, mission_planning_code, mission_planning_desc')
        .eq('fk_owner_id', ownerId)
        .eq('mission_planning_active', 'Y')
        .order('mission_planning_code');
    if (clientId) query = query.eq('fk_client_id', clientId);
    if (vehicleId) query = query.eq('fk_tool_id', vehicleId);
    const { data, error } = await query;
    if (error) throw error;

    return data
}

export async function importCategories(ownerId: number) {
    const { data, error } = await supabase
        .from('pilot_mission_category')
        .select('category_id, category_name')
        .eq('fk_owner_id', ownerId)
        .eq('is_active', true)
        .order('category_name');
    if (error) throw error;
    return data
}

export async function importTypes(ownerId: number) {
    const { data, error } = await supabase
        .from('pilot_mission_type')
        .select('mission_type_id, type_name')
        .eq('fk_owner_id', ownerId)
        .eq('is_active', true)
        .order('type_name');
    if (error) throw error;
    return data
}

export async function importStatus(ownerId: number) {
    const { data, error } = await supabase
        .from('pilot_mission_status')
        .select('status_id, status_name')
        .eq('fk_owner_id', ownerId)
        .eq('is_active', true)
        .order('status_order');
    if (error) throw error;
    return data
}

export async function importPilots(ownerId: number) {
    const { data, error } = await supabase
        .from('users')
        .select('user_id, first_name, last_name')
        .eq('fk_owner_id', ownerId)
        .eq('user_role', 'PIC')
        .eq('user_active', 'Y')
        .order('first_name');
    if (error) throw error;
    return data
}