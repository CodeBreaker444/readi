'use server';

import { supabase } from '@/backend/database/database';
import { BUCKET, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface GutmaPreviewForSync {
  flight_id: string;
  filename?: string;
  aircraft?: {
    serial_number?: string;
    product_name?: string;
    model?: string;
    manufacturer?: string;
    firmware_version?: string;
  };
  gcs?: {
    serial_number?: string;
    type?: string;
    name?: string;
  };
  payload?: Array<{
    serial_number?: string;
    type?: string;
    cycle_count?: number;
    model?: string;
  }>;
  start_time?: string | null;
  end_time?: string | null;
  // waypoints, events, etc.
  [key: string]: unknown;
}

export interface GutmaSyncResult {
  success: boolean;
  missing_sns?: string[];
  updated_components?: Array<{
    serial_number: string;
    component_type: string | null;
  }>;
  s3_key?: string;
  duration_seconds?: number;
  mission_synced?: boolean;
}


function hhmmToMinutes(hhmm: number): number {
  const h = Math.floor(hhmm);
  const m = Math.round((hhmm - h) * 100);
  return h * 60 + m;
}

function addHhmmHours(a: number, b: number): number {
  const totalMin = hhmmToMinutes(a) + hhmmToMinutes(b);
  return Math.floor(totalMin / 60) + (totalMin % 60) / 100;
}

function secondsToHhmm(seconds: number): number {
  if (seconds <= 0) return 0;
  const totalMinutes = Math.round(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + m / 100;
}


export async function gutmaArchiveAndSync(
  ownerId: number,
  preview: GutmaPreviewForSync,
  s3ObjectKey: string,
): Promise<GutmaSyncResult> {

  const PLACEHOLDER_SNS = new Set(['n/a', 'na', 'unknown', 'none', '-', 'null']);
  const isValidSn = (sn: string | undefined) =>
    !!sn && !PLACEHOLDER_SNS.has(sn.toLowerCase());

  const snsToFind: string[] = [];
  const aircraftSn = preview.aircraft?.serial_number?.trim();
  const gcsSn = preview.gcs?.serial_number?.trim();

  if (isValidSn(aircraftSn)) snsToFind.push(aircraftSn!);
  if (isValidSn(gcsSn)) snsToFind.push(gcsSn!);

  for (const p of preview.payload ?? []) {
    const sn = p.serial_number?.trim();
    if (isValidSn(sn)) snsToFind.push(sn!);
  }

  if (snsToFind.length === 0) {
    return {
      success: false,
      missing_sns: ['__no_sns__'], // no id message
    };
  }

  // Fetching all tool_ids  
  const { data: ownerTools, error: toolsError } = await supabase
    .from('tool')
    .select('tool_id')
    .eq('fk_owner_id', ownerId)
    .eq('tool_active', 'Y');

  if (toolsError) throw toolsError;

  const toolIds = (ownerTools ?? []).map((t: any) => t.tool_id);

  // Looking up matching components by serial number, scoped to this owner's tools
  const foundComponents: Array<{
    component_id: number;
    fk_tool_id: number;
    serial_number: string;
    component_type: string | null;
    component_metadata: unknown;
    current_usage_hours: number;
    current_maintenance_hours: number;
    current_maintenance_flights: number;
    maintenance_cycle_hour: number;
    maintenance_cycle_flight: number;
  }> = [];

  if (toolIds.length > 0) {
    const { data: comps, error: compError } = await supabase
      .from('tool_component')
      .select(`
        component_id,
        fk_tool_id,
        serial_number,
        component_type,
        component_metadata,
        current_usage_hours,
        current_maintenance_hours,
        current_maintenance_flights,
        maintenance_cycle_hour,
        maintenance_cycle_flight
      `)
      .in('fk_tool_id', toolIds)
      .in('serial_number', snsToFind)
      .eq('component_active', 'Y');

    if (compError) throw compError;
    foundComponents.push(...(comps ?? []));
  }

  // identify any unrecognised serial numbers
  const foundSnsSet = new Set(
    foundComponents.map((c) => c.serial_number).filter(Boolean),
  );
  const missingSns = snsToFind.filter((sn) => !foundSnsSet.has(sn));

  if (missingSns.length > 0) {
    return { success: false, missing_sns: missingSns };
  }

  // computing flight duration from gutma timestamps
  let durationSeconds = 0;
  if (preview.start_time && preview.end_time) {
    const start = new Date(preview.start_time).getTime();
    const end = new Date(preview.end_time).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      durationSeconds = Math.round((end - start) / 1000);
    }
  }
  const durationHhmm = secondsToHhmm(durationSeconds);

  // server-side — no presigned URL needed
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3ObjectKey,
      Body: JSON.stringify(preview),
      ContentType: 'application/json',
      ServerSideEncryption: 'AES256',
    }),
  );

  // Update each matched component
  const now = new Date().toISOString();
  // Derive the calendar date of this log for battery deduplication 
  const logDate = preview.start_time
    ? new Date(preview.start_time).toISOString().split('T')[0]
    : now.split('T')[0];

  const updatedComponents: Array<{ serial_number: string; component_type: string | null }> = [];

  for (const comp of foundComponents) {
    const prevLifetimeHours = Number(comp.current_usage_hours ?? 0);
    const prevMaintHours = Number(comp.current_maintenance_hours ?? 0);
    const prevMaintFlights = Number(comp.current_maintenance_flights ?? 0);
    const limitHour = Number(comp.maintenance_cycle_hour ?? 0);
    const limitFlight = Number(comp.maintenance_cycle_flight ?? 0);

    const newLifetimeHours = addHhmmHours(prevLifetimeHours, durationHhmm);
    const newMaintHours = addHhmmHours(prevMaintHours, durationHhmm);
    const newMaintFlights = prevMaintFlights + 1;

    let existingMeta: Record<string, unknown> = {};
    const rawMeta = comp.component_metadata;
    if (rawMeta) {
      if (typeof rawMeta === 'string') {
        try { existingMeta = JSON.parse(rawMeta); } catch { existingMeta = {}; }
      } else if (typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
        existingMeta = rawMeta as Record<string, unknown>;
      }
    }

    // if this component is a battery in the payload, capture firmware cycle count
    const gutmaBattery = preview.payload?.find(
      (p) => p.serial_number?.trim() === comp.serial_number,
    );

    // For battery components: skip cycle update if this log date was already applied
    if (gutmaBattery != null) {
      const prevLogDate = existingMeta.last_battery_log_date as string | undefined;
      if (prevLogDate === logDate) {
        continue;
      }
    }

    const updatePayload: Record<string, unknown> = {
      current_usage_hours: newLifetimeHours,
      component_metadata: JSON.stringify({
        ...existingMeta,
        last_flytbase_flight_id: preview.flight_id,
        last_gutma_sync: now,
        ...(gutmaBattery != null
          ? {
              last_battery_log_date: logDate,
              ...(gutmaBattery.cycle_count != null
                ? { gutma_battery_cycle_count: gutmaBattery.cycle_count }
                : {}),
            }
          : {}),
      }),
    };

    // only advance maintenance counters when limits are configured
    if (limitHour > 0 && durationHhmm > 0) {
      updatePayload.current_maintenance_hours = newMaintHours;
    }
    if (limitFlight > 0) {
      updatePayload.current_maintenance_flights = newMaintFlights;
    }

    await supabase
      .from('tool_component')
      .update(updatePayload)
      .eq('component_id', comp.component_id)
      .eq('fk_tool_id', comp.fk_tool_id);

    updatedComponents.push({
      serial_number: comp.serial_number,
      component_type: comp.component_type,
    });
  }

  //if this flight is linked to a pilot_mission, auto-sync flight time + dates
  let missionSynced = false;
  try {
    const { data: logRecord } = await supabase
      .from('mission_flight_logs')
      .select('fk_mission_id')
      .eq('flytbase_flight_id', preview.flight_id)
      .maybeSingle();

    if (logRecord?.fk_mission_id) {
      const missionUpdate: Record<string, unknown> = { updated_at: now };

      if (durationSeconds > 0) {
        missionUpdate.flight_duration = Math.round(durationSeconds / 60);
      }
      if (preview.start_time) missionUpdate.actual_start = preview.start_time;
      if (preview.end_time) missionUpdate.actual_end = preview.end_time;

      await supabase
        .from('pilot_mission')
        .update(missionUpdate)
        .eq('pilot_mission_id', logRecord.fk_mission_id);

      missionSynced = true;
    }
  } catch {
    // mission sync is best-effort — don't fail the archive
  }

  return {
    success: true,
    updated_components: updatedComponents,
    s3_key: s3ObjectKey,
    duration_seconds: durationSeconds,
    mission_synced: missionSynced,
  };
}
