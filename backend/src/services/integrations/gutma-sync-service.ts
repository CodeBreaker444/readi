'use server';

import { prisma } from '@/lib/prisma';
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
      missing_sns: ['__no_sns__'],
    };
  }

  // Fetching all tool_ids
  const ownerTools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    select: { tool_id: true },
  });

  const toolIds = ownerTools.map((t) => t.tool_id);

  // Looking up matching components by serial number, scoped to this owner's tools
  const foundComponents = toolIds.length > 0
    ? await prisma.tool_component.findMany({
        where: {
          fk_tool_id: { in: toolIds },
          serial_number: { in: snsToFind },
          component_active: 'Y',
        },
        select: {
          component_id: true,
          fk_tool_id: true,
          serial_number: true,
          component_type: true,
          component_metadata: true,
          current_usage_hours: true,
          current_maintenance_hours: true,
          current_maintenance_flights: true,
          maintenance_cycle_hour: true,
          maintenance_cycle_flight: true,
        },
      })
    : [];

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
    if (rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
      existingMeta = rawMeta as Record<string, unknown>;
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

    const newMeta: Record<string, unknown> = {
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
    };

    const updateData: Record<string, unknown> = {
      current_usage_hours: newLifetimeHours,
      component_metadata: newMeta,
    };

    // only advance maintenance counters when limits are configured
    if (limitHour > 0 && durationHhmm > 0) {
      updateData.current_maintenance_hours = newMaintHours;
    }
    if (limitFlight > 0) {
      updateData.current_maintenance_flights = newMaintFlights;
    }

    await prisma.tool_component.update({
      where: { component_id: comp.component_id },
      data: updateData,
    });

    updatedComponents.push({
      serial_number: comp.serial_number ?? '',
      component_type: comp.component_type ?? null,
    });
  }

  // if this flight is linked to a pilot_mission, auto-sync flight time + dates
  let missionSynced = false;
  try {
    const logRecord = await prisma.mission_flight_logs.findFirst({
      where: { flytbase_flight_id: preview.flight_id },
      select: { fk_mission_id: true },
    });

    if (logRecord?.fk_mission_id) {
      const missionData: {
        updated_at: Date;
        flight_duration?: number;
        actual_start?: Date;
        actual_end?: Date;
      } = { updated_at: new Date() };

      if (durationSeconds > 0) {
        missionData.flight_duration = Math.round(durationSeconds / 60);
      }
      if (preview.start_time) missionData.actual_start = new Date(preview.start_time);
      if (preview.end_time) missionData.actual_end = new Date(preview.end_time);

      await prisma.pilot_mission.update({
        where: { pilot_mission_id: Number(logRecord.fk_mission_id) },
        data: missionData,
      });

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
