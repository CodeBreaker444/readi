import { parseGutmaFlightData } from '@/backend/services/integrations/gutma-parser';
import { prisma } from '@/lib/prisma';
import { serialsMatch } from '@/lib/serial-number';
import { BUCKET, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

/** Looks up the registered serial number for a tool's drone/aircraft component, if any. */
async function getDroneSerialNumberForTool(toolId: number): Promise<string | null> {
  const droneComponent = await prisma.tool_component.findFirst({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
      OR: [
        { component_type: { equals: 'DRONE', mode: 'insensitive' } },
        { component_type: { equals: 'AIRCRAFT', mode: 'insensitive' } },
      ],
      serial_number: { not: null },
    },
    select: { serial_number: true },
  });
  return droneComponent?.serial_number?.trim() || null;
}


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
  lucProcedureId: number | null;
  groupLabel: string;
  notes: string;
  location: string;
  userId: number;
  missionCode?: string;
}

export interface ImportMissionResult {
  newMissionIds: number[];
  operations: any[];
  skipped: string[];
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

/** GUTMA nests everything under exchange.message.flight_data — pull the raw flight_id out of that envelope for mission-code fallback. */
function resolveFlightId(parsed: any): string | null {
  const message = parsed?.exchange?.message ?? parsed?.gutma?.exchange?.message ?? {};
  return message?.flight_data?.flight_id ?? null;
}

function resolveMissionCode(flightId: string | null, filename: string): string {
  return (
    extractMissionCodeFromFilename(filename) ??
    flightId ??
    `IMPORT-${Date.now()}`
  );
}


async function processGutmaBuffer(
  buffer: ArrayBuffer,
  filename: string,
  params: ImportMissionParams,
  sourceFlightId: string | null,
  missionCodeOverride?: string
): Promise<{ missionId: number; operation: any } | { error: string; duplicate?: boolean }> {
  let parsed: any;
  try {
    parsed = JSON.parse(new TextDecoder().decode(buffer));
  } catch (e) {
    return { error: `Failed to parse JSON in "${filename}": ${(e as Error).message}` };
  }

  const gutma = parseGutmaFlightData(parsed);
  const missionCode = missionCodeOverride || resolveMissionCode(resolveFlightId(parsed), filename);
  const takeoff = gutma.start_time;
  const landing = gutma.end_time;
  const durationSec = parseDurationSeconds(takeoff, landing);
  const distanceFlown = gutma.distance_m;

  const logSerialNumber = typeof gutma.aircraft?.serial_number === 'string'
    ? gutma.aircraft.serial_number.trim() || null
    : null;

  if (params.vehicleId && logSerialNumber) {
    const vehicleSerial = await getDroneSerialNumberForTool(params.vehicleId);
    if (vehicleSerial && !serialsMatch(vehicleSerial, logSerialNumber)) {
      return { error: `No system is present with the serial number ${logSerialNumber}` };
    }
  }

  const existing = await prisma.pilot_mission.findFirst({
    where: { mission_code: missionCode, fk_owner_id: params.ownerId },
    select: { pilot_mission_id: true },
  });

  if (existing) {
    return { duplicate: true, error: `Duplicate mission_code "${missionCode}" — skipped` };
  }

  let statusName: string | null = null;
  if (params.statusId) {
    const st = await prisma.pilot_mission_status.findUnique({
      where: { status_id: params.statusId },
      select: { status_name: true },
    });
    statusName = st?.status_name ?? null;
  }

  const notesArr = [
    params.notes || null,
    params.groupLabel ? `Group: ${params.groupLabel}` : null,
    `Platform: ${params.platform}`,
    `Source: ${filename}`,
  ].filter(Boolean);

  const inserted = await prisma.pilot_mission.create({
    data: {
      fk_owner_id: params.ownerId,
      fk_client_id: params.clientId || null,
      fk_pilot_user_id: params.pilotId || 1,
      fk_tool_id: params.vehicleId || null,
      fk_planning_id: params.planId || null,
      fk_mission_type_id: params.typeId || null,
      fk_mission_category_id: params.categoryId || null,
      fk_mission_status_id: params.statusId || null,
      fk_luc_procedure_id: params.lucProcedureId || null,
      mission_code: missionCode,
      mission_name: missionCode,
      status_name: statusName,
      location: params.location || null,
      mission_description: params.notes || null,
      scheduled_start: takeoff ? new Date(takeoff) : null,
      actual_start: takeoff ? new Date(takeoff) : null,
      actual_end: landing ? new Date(landing) : null,
      flight_duration: durationSec,
      distance_flown: distanceFlown,
      notes: notesArr.join(' | ') || null,
    } as any,
    select: { pilot_mission_id: true },
  });

  try {
    const s3Key = `flight-logs/mission/${inserted.pilot_mission_id}/${filename}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: Buffer.from(buffer),
        ContentType: 'application/json',
        ContentDisposition: `attachment; filename="${filename}"`,
        ServerSideEncryption: 'AES256',
      })
    );

    await prisma.mission_flight_logs.create({
      data: {
        fk_mission_id: BigInt(inserted.pilot_mission_id),
        log_source: sourceFlightId ? 'flytbase' : 'manual',
        s3_key: s3Key,
        original_filename: filename,
        flytbase_flight_id: sourceFlightId,
        uploaded_by: BigInt(params.userId),
      },
    });
  } catch (err) {
    // Best-effort — the mission was already created; a storage failure
    // shouldn't roll back the import, but should be visible in logs.
    console.error('[processGutmaBuffer] Failed to persist flight log:', err);
  }

  const full = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: inserted.pilot_mission_id },
    select: {
      pilot_mission_id: true,
      mission_code: true,
      mission_name: true,
      status_name: true,
      scheduled_start: true,
      actual_start: true,
      actual_end: true,
      distance_flown: true,
      location: true,
      notes: true,
      users: { select: { first_name: true, last_name: true } },
      tool: { select: { tool_code: true } },
    },
  });

  const operation = full ? {
    ...full,
    pilot_name: full.users
      ? `${full.users.first_name ?? ''} ${full.users.last_name ?? ''}`.trim()
      : null,
    tool_code: full.tool?.tool_code ?? null,
  } : null;

  return { missionId: inserted.pilot_mission_id, operation };
}


export async function importMissionFromLog(
  file: File,
  params: ImportMissionParams,
  flytbaseFlightId: string | null = null
): Promise<ImportMissionResult> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.split('.').pop()?.toLowerCase();

  const successes: Array<{ missionId: number; operation: any }> = [];
  const errors: string[] = [];
  const duplicates: string[] = [];

  const missionCode = params.missionCode?.trim() || undefined;

  if (ext === 'gutma') {
    const res = await processGutmaBuffer(buffer, file.name, params, flytbaseFlightId, missionCode);
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

    // A user-provided code only uniquely identifies a single mission, so a
    // multi-file ZIP gets it suffixed per entry to avoid duplicate codes.
    let index = 0;
    for (const [name, entry] of gutmaEntries) {
      index++;
      const entryCode = missionCode
        ? (gutmaEntries.length > 1 ? `${missionCode}-${index}` : missionCode)
        : undefined;
      const buf = await entry.async('arraybuffer');
      const res = await processGutmaBuffer(buf, name.split('/').pop() ?? name, params, null, entryCode);
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
    operations: successes.map((r) => r.operation).filter(Boolean),
    skipped: duplicates,
  };
}


export async function importClinets(ownerId: number) {
  return prisma.client.findMany({
    where: { fk_owner_id: ownerId, client_active: 'Y' },
    orderBy: { client_name: 'asc' },
    select: { client_id: true, client_name: true, client_code: true },
  });
}

export async function importDrones(ownerId: number, clientId?: number) {
  const allTools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    orderBy: { tool_code: 'asc' },
    select: { tool_id: true, tool_code: true, tool_name: true, tool_metadata: true },
  });

  const tools = clientId
    ? allTools.filter((t) => (t.tool_metadata as any)?.clientId === clientId)
    : allTools;

  const toolIds = tools.map((t) => t.tool_id);
  const inMaintenanceSet = new Set<number>();
  const maintenanceDueSet = new Set<number>();
  const nonOperationalSet = new Set<number>();

  const droneSerialMap = new Map<number, string | null>();

  if (toolIds.length > 0) {
    const [openTickets, maintComps, expiredComps, droneComponents] = await Promise.all([
      prisma.maintenance_ticket.findMany({
        where:  { fk_tool_id: { in: toolIds }, ticket_status: { not: 'CLOSED' } },
        select: { fk_tool_id: true },
      }),
      prisma.tool_component.findMany({
        where:  { fk_tool_id: { in: toolIds }, component_active: 'Y' },
        select: {
          fk_tool_id:                  true,
          maintenance_cycle_day:       true,
          maintenance_cycle_hour:      true,
          maintenance_cycle_flight:    true,
          current_maintenance_days:    true,
          current_maintenance_hours:   true,
          current_maintenance_flights: true,
        },
      }),
      prisma.tool_component.findMany({
        where:  { fk_tool_id: { in: toolIds }, component_active: 'Y', expiration_date: { lte: new Date(), not: null } },
        select: { fk_tool_id: true },
      }),
      prisma.tool_component.findMany({
        where:  {
          fk_tool_id: { in: toolIds },
          component_active: 'Y',
          OR: [
            { component_type: { equals: 'DRONE', mode: 'insensitive' } },
            { component_type: { equals: 'AIRCRAFT', mode: 'insensitive' } },
          ],
        },
        select: { fk_tool_id: true, serial_number: true },
      }),
    ]);
    openTickets.forEach((t) => { if (t.fk_tool_id != null) inMaintenanceSet.add(t.fk_tool_id); });
    expiredComps.forEach((c) => { if (c.fk_tool_id != null) nonOperationalSet.add(c.fk_tool_id); });
    maintComps.forEach((c) => {
      if (c.fk_tool_id == null || inMaintenanceSet.has(c.fk_tool_id)) return;
      const dayDue    = Number(c.maintenance_cycle_day    ?? 0) > 0 && Number(c.current_maintenance_days)    >= Number(c.maintenance_cycle_day);
      const hourDue   = Number(c.maintenance_cycle_hour   ?? 0) > 0 && Number(c.current_maintenance_hours)   >= Number(c.maintenance_cycle_hour);
      const flightDue = Number(c.maintenance_cycle_flight ?? 0) > 0 && Number(c.current_maintenance_flights) >= Number(c.maintenance_cycle_flight);
      if (dayDue || hourDue || flightDue) maintenanceDueSet.add(c.fk_tool_id);
    });
    droneComponents.forEach((c) => {
      if (c.fk_tool_id != null && !droneSerialMap.has(c.fk_tool_id)) {
        droneSerialMap.set(c.fk_tool_id, c.serial_number?.trim() || null);
      }
    });
  }

  return tools.map((t) => ({
    tool_id: t.tool_id,
    tool_code: t.tool_code,
    tool_name: t.tool_name,
    in_maintenance: inMaintenanceSet.has(t.tool_id),
    maintenance_due: maintenanceDueSet.has(t.tool_id),
    is_non_operational: nonOperationalSet.has(t.tool_id),
    is_dismissed: (t.tool_metadata as any)?.status === 'DISMISSED',
    drone_serial_number: droneSerialMap.get(t.tool_id) ?? null,
  }));
}

export async function importPlans(ownerId: number, clientId?: number, vehicleId?: number) {
  return prisma.planning_logbook.findMany({
    where: {
      fk_owner_id: ownerId,
      mission_planning_active: 'Y',
      ...(clientId && { fk_client_id: clientId }),
      ...(vehicleId && { fk_tool_id: vehicleId }),
    },
    orderBy: { mission_planning_code: 'asc' },
    select: {
      mission_planning_id: true,
      mission_planning_code: true,
      mission_planning_desc: true,
    },
  });
}

export async function importCategories(ownerId: number) {
  return prisma.pilot_mission_category.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { category_name: 'asc' },
    select: { category_id: true, category_name: true },
  });
}

export async function importTypes(ownerId: number) {
  return prisma.pilot_mission_type.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { type_name: 'asc' },
    select: { mission_type_id: true, type_name: true },
  });
}

export async function importStatus(ownerId: number) {
  return prisma.pilot_mission_status.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    orderBy: { status_order: 'asc' },
    select: { status_id: true, status_name: true },
  });
}

export async function importLucProcedures(ownerId: number) {
  return prisma.luc_procedure.findMany({
    where: { fk_owner_id: ownerId, procedure_status: 'MISSION', procedure_active: 'Y' },
    orderBy: { procedure_name: 'asc' },
    select: { procedure_id: true, procedure_name: true, procedure_code: true },
  });
}

export async function importPilots(ownerId: number) {
  return prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_role: 'PIC', user_active: 'Y' },
    orderBy: { first_name: 'asc' },
    select: { user_id: true, first_name: true, last_name: true },
  });
}