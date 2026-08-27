import { parseGutmaFlightData } from '@/backend/services/integrations/gutma-parser';
import { prisma } from '@/lib/prisma';
import { serialInList } from '@/lib/serial-number';
import { BUCKET, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import { sendMissionCreatedModuleEmail, sendMissionAssignedModuleEmail } from '@/backend/services/settings/module-email-notification-service';

/** Looks up the registered serial numbers for ALL of a tool's active drone/aircraft components — a tool (system) can have more than one, e.g. a dock with several swappable airframes. */
async function getDroneSerialNumbersForTool(toolId: number): Promise<string[]> {
  const droneComponents = await prisma.tool_component.findMany({
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
  return droneComponents
    .map((c) => c.serial_number?.trim() || null)
    .filter((s): s is string => !!s);
}


export interface ImportMissionParams {
  ownerId: number;
  clientId: number;
  platform: string;
  vehicleId: number;
  categoryId: number;
  typeId: number;
  planId: number | null;
  missionPlanningId: number | null;
  statusId?: number;
  resultId: number;
  pilotId: number;
  visualObserverIds?: number[];
  lucProcedureId: number | null;
  groupLabel: string;
  notes: string;
  location: string;
  userId: number;
  missionCode?: string;
  flightMode?: string | null;
  opType?: string | null;
  userTimezone?: string;
  isRecurrent?: boolean;
  missionStartDate?: string;
  recurrentDaysOfWeek?: number[];
  recurrentEndDate?: string;
}

export interface ImportMissionResult {
  newMissionIds: number[];
  operations: any[];
  skipped: string[];
}

function asUtc(ts: Date | string | null | undefined): string | null {
  if (!ts) return null;
  const s = ts instanceof Date ? ts.toISOString() : ts;
  return s.endsWith('Z') || s.includes('+') ? s : s + 'Z';
}

function parseDurationSeconds(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return isNaN(ms) || ms < 0 ? null : Math.round(ms / 1000);
}

const STATUS_NAME_TO_ID: Record<string, number> = {
  PLANNED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: 4,
  ABORTED: 5,
};

function normalizeStatusName(rawName: string | null | undefined): string {
  const s = (rawName ?? '').toLowerCase();
  if (s.includes('progress')) return 'IN_PROGRESS';
  if (s.includes('complet')) return 'COMPLETED';
  if (s.includes('cancel')) return 'CANCELLED';
  if (s.includes('abort')) return 'ABORTED';
  return 'PLANNED';
}

// Same 6-char alphanumeric scheme as the normal mission-creation flow
// (NewOperationModal.generateMissionId) — not derived from the log file.
const MISSION_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomMissionCode(): string {
  return Array.from({ length: 6 }, () => MISSION_CODE_CHARS[Math.floor(Math.random() * MISSION_CODE_CHARS.length)]).join('');
}

async function generateUniqueMissionCode(ownerId: number): Promise<string> {
  for (let attempts = 0; attempts < 100; attempts++) {
    const code = randomMissionCode();
    const existing = await prisma.pilot_mission.findFirst({
      where: { mission_code: code, fk_owner_id: ownerId },
      select: { pilot_mission_id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique mission code');
}

function generateRecurringGroupId(): string {
  return `RG-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Walks forward from `anchor` (the mission's own start date) through `endDate`,
// keeping only the days whose weekday (0=Sun..6=Sat) is in `daysOfWeek`.
function getRecurringDates(anchor: Date, endDate: string, daysOfWeek: number[]): Date[] {
  const dates: Date[] = [];
  const current = new Date(anchor);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (daysOfWeek.includes(current.getDay())) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}


async function processGutmaBuffer(
  buffer: ArrayBuffer,
  filename: string,
  params: ImportMissionParams,
  sourceFlightId: string | null,
  missionCodeOverride?: string,
  recurringGroupId?: string,
  dateIndex?: number,
  targetDate?: Date
): Promise<{ missionId: number; operation: any } | { error: string; duplicate?: boolean }> {
  let parsed: any;
  try {
    parsed = JSON.parse(new TextDecoder().decode(buffer));
  } catch (e) {
    return { error: `Failed to parse JSON in "${filename}": ${(e as Error).message}` };
  }

  const gutma = parseGutmaFlightData(parsed);
  let missionCode = missionCodeOverride || await generateUniqueMissionCode(params.ownerId);
  
  // Add index to mission code for recurrent missions
  if (recurringGroupId && dateIndex !== undefined) {
    missionCode = `${missionCode}-${dateIndex + 1}`;
  }
  
  const takeoff = gutma.start_time;
  const landing = gutma.end_time;
  const durationSec = parseDurationSeconds(takeoff, landing);
  const distanceFlown = gutma.distance_m;
  const batteryChargeStart = gutma.battery_charge_start;
  const batteryChargeEnd = gutma.battery_charge_end;
  const weatherTemperature = gutma.weather_temperature;

  const logSerialNumber = typeof gutma.aircraft?.serial_number === 'string'
    ? gutma.aircraft.serial_number.trim() || null
    : null;

  if (params.vehicleId && logSerialNumber) {
    const vehicleSerials = await getDroneSerialNumbersForTool(params.vehicleId);
    if (vehicleSerials.length > 0 && !serialInList(vehicleSerials, logSerialNumber)) {
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

  // Imported missions — recurring or not — are generated from a flight log
  // that already happened, so they're always COMPLETED, never scheduled.
  const statusName = 'COMPLETED';

  const notesArr = [
    params.notes || null,
    params.groupLabel ? `Group: ${params.groupLabel}` : null,
    `Platform: ${params.platform}`,
    `Source: ${filename}`,
  ].filter(Boolean);

  // Handle visual observers
  let visualObservers: { user_id: number; name: string }[] | null = null;
  if (params.visualObserverIds?.length) {
    const observerUsers = await prisma.public_users.findMany({
      where: { user_id: { in: params.visualObserverIds } },
      select: { user_id: true, first_name: true, last_name: true },
    });
    if (observerUsers.length) {
      visualObservers = observerUsers.map((u) => ({
        user_id: u.user_id,
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim(),
      }));
    }
  }

  // Convert dates to user's timezone for storage
  let scheduledStart: Date | null = null;
  let actualStart: Date | null = null;
  let actualEnd: Date | null = null;
  
  // For recurrent missions, each occurrence keeps the mission's own start
  // time-of-day but lands on the matching day-of-week date.
  if (recurringGroupId && params.missionStartDate && targetDate) {
    const anchor = new Date(params.missionStartDate);
    const scheduledDate = new Date(targetDate);
    scheduledDate.setHours(anchor.getHours(), anchor.getMinutes(), 0, 0);
    scheduledStart = scheduledDate;
    actualStart = scheduledDate;
    // Set actual end to 1 hour after start for recurrent missions
    actualEnd = new Date(scheduledDate.getTime() + 60 * 60 * 1000);
  } else if (takeoff) {
    const takeoffDate = new Date(takeoff);
    if (params.userTimezone) {
      // Parse the date in the user's timezone and store as UTC
      const userTzDate = new Date(takeoffDate.toLocaleString('en-US', { timeZone: params.userTimezone }));
      scheduledStart = userTzDate;
      actualStart = userTzDate;
    } else {
      scheduledStart = takeoffDate;
      actualStart = takeoffDate;
    }
  }
  
  if (landing && !recurringGroupId) {
    const landingDate = new Date(landing);
    if (params.userTimezone) {
      const userTzDate = new Date(landingDate.toLocaleString('en-US', { timeZone: params.userTimezone }));
      actualEnd = userTzDate;
    } else {
      actualEnd = landingDate;
    }
  }

  const missionMetadataFields: Record<string, unknown> = {};
  if (params.missionPlanningId && params.flightMode) missionMetadataFields.flight_mode = params.flightMode;
  if (params.opType) missionMetadataFields.op_type = params.opType;
  if (recurringGroupId) {
    missionMetadataFields.is_recurrent = true;
    if (params.recurrentDaysOfWeek?.length) missionMetadataFields.recurrent_days_of_week = params.recurrentDaysOfWeek;
  }

  const inserted = await prisma.pilot_mission.create({
    data: {
      fk_owner_id: params.ownerId,
      fk_client_id: params.clientId || null,
      fk_pilot_user_id: params.pilotId || 1,
      fk_tool_id: params.vehicleId || null,
      fk_planning_id: params.planId || null,
      fk_mission_planning_id: params.missionPlanningId || null,
      fk_mission_type_id: params.typeId || null,
      fk_mission_category_id: params.categoryId || null,
      fk_mission_status_id: STATUS_NAME_TO_ID[statusName] ?? 3,
      fk_luc_procedure_id: params.lucProcedureId || null,
      mission_code: missionCode,
      mission_name: missionCode,
      status_name: statusName,
      location: params.location || null,
      mission_description: params.notes || null,
      scheduled_start: scheduledStart,
      actual_start: actualStart,
      actual_end: actualEnd,
      flight_duration: durationSec,
      distance_flown: distanceFlown,
      battery_charge_start: batteryChargeStart,
      battery_charge_end: batteryChargeEnd,
      weather_temperature: weatherTemperature,
      notes: notesArr.join(' | ') || null,
      mission_group_label: params.groupLabel || null,
      ...(recurringGroupId && {
        recurring_group_id: recurringGroupId,
        mission_date_until: params.recurrentEndDate ? new Date(params.recurrentEndDate) : null,
        ...(Object.keys(missionMetadataFields).length && { mission_metadata: missionMetadataFields }),
      }),
      ...(!recurringGroupId && {
        mission_metadata: {
          ...missionMetadataFields,
          ...(visualObservers?.length && { visual_observers: visualObservers }),
          is_imported: true,
        },
      }),
    } as any,
    select: { pilot_mission_id: true },
  });

  // Send mission creation and assignment email notifications
  try {
    const missionType = params.typeId
      ? await prisma.pilot_mission_type.findUnique({
          where: { mission_type_id: params.typeId },
          select: { type_name: true },
        })
      : null;

    const user = await prisma.public_users.findUnique({
      where: { user_id: params.userId },
      select: { first_name: true, last_name: true },
    });

    const createdBy = user
      ? `${user.first_name} ${user.last_name}`.trim()
      : 'System';

    // Send mission created email
    await sendMissionCreatedModuleEmail(params.ownerId, {
      missionCode: missionCode,
      missionType: missionType?.type_name || 'Unknown',
      createdBy,
      scheduledDate: scheduledStart?.toISOString(),
      description: params.notes || undefined,
    });

    // Send mission assigned email to pilot
    if (params.pilotId) {
      const pilotUser = await prisma.public_users.findUnique({
        where: { user_id: params.pilotId },
        select: { first_name: true, last_name: true },
      });

      if (pilotUser) {
        await sendMissionAssignedModuleEmail(params.ownerId, {
          missionCode: missionCode,
          missionType: missionType?.type_name || 'Unknown',
          assignedBy: createdBy,
          assignedTo: `${pilotUser.first_name} ${pilotUser.last_name}`.trim(),
          role: 'Pilot',
          scheduledDate: scheduledStart?.toISOString(),
          description: params.notes || undefined,
        }, [params.pilotId]);
      }
    }

    // Send mission assigned emails to visual observers
    if (params.visualObserverIds && params.visualObserverIds.length > 0) {
      const observerUsers = await prisma.public_users.findMany({
        where: { user_id: { in: params.visualObserverIds } },
        select: { user_id: true, first_name: true, last_name: true },
      });

      for (const observer of observerUsers) {
        await sendMissionAssignedModuleEmail(params.ownerId, {
          missionCode: missionCode,
          missionType: missionType?.type_name || 'Unknown',
          assignedBy: createdBy,
          assignedTo: `${observer.first_name} ${observer.last_name}`.trim(),
          role: 'Observer',
          scheduledDate: scheduledStart?.toISOString(),
          description: params.notes || undefined,
        }, [observer.user_id]);
      }
    }
  } catch (emailError) {
    console.error('[processGutmaBuffer] Failed to send mission email notifications:', emailError);
    // Don't fail the import if email fails
  }

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
    include: {
      users: { select: { first_name: true, last_name: true } },
      tool: { select: { tool_code: true, tool_name: true } },
      client: { select: { client_name: true } },
      planning: { select: { planning_name: true, client: { select: { client_name: true } } } },
      pilot_mission_category: { select: { category_name: true } },
      pilot_mission_type: { select: { type_name: true } },
    },
  });

  const operation = full ? {
    ...full,
    actual_start: asUtc(full.actual_start),
    actual_end: asUtc(full.actual_end),
    pilot_name: full.users
      ? `${full.users.first_name ?? ''} ${full.users.last_name ?? ''}`.trim()
      : null,
    tool_code: full.tool?.tool_code ?? null,
    tool_name: full.tool?.tool_name ?? null,
    client_name: full.planning?.client?.client_name ?? full.client?.client_name ?? null,
    planning_name: full.planning?.planning_name ?? null,
    category_name: full.pilot_mission_category?.category_name ?? null,
    type_name: full.pilot_mission_type?.type_name ?? null,
    visual_observer_ids: (full.mission_metadata as any)?.visual_observers ?? null,
    flight_mode: (full.mission_metadata as any)?.flight_mode ?? null,
    op_type: (full.mission_metadata as any)?.op_type ?? null,
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
  const recurringGroupId = params.isRecurrent ? generateRecurringGroupId() : undefined;

  if (params.isRecurrent && (!params.missionStartDate || !params.recurrentEndDate || !params.recurrentDaysOfWeek?.length)) {
    throw new Error('Recurrent mission requires a start date, days of the week, and an end date');
  }

  const datesToProcess: (Date | null)[] = params.isRecurrent && params.missionStartDate && params.recurrentEndDate && params.recurrentDaysOfWeek
    ? getRecurringDates(new Date(params.missionStartDate), params.recurrentEndDate, params.recurrentDaysOfWeek)
    : [null];

  if (ext === 'gutma') {
    for (let dateIndex = 0; dateIndex < datesToProcess.length; dateIndex++) {
      const res = await processGutmaBuffer(buffer, file.name, params, flytbaseFlightId, missionCode, recurringGroupId, dateIndex, datesToProcess[dateIndex] ?? undefined);
      if ('error' in res) {
        if (res.duplicate) duplicates.push(res.error);
        else errors.push(res.error);
      } else {
        successes.push(res);
      }
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

    // For recurrent missions with ZIP files, create missions for each date for each gutma file
    for (const [name, entry] of gutmaEntries) {
      const buf = await entry.async('arraybuffer');
      const entryName = name.split('/').pop() ?? name;
      
      for (let dateIndex = 0; dateIndex < datesToProcess.length; dateIndex++) {
        const entryCode = missionCode
          ? (datesToProcess.length > 1 ? `${missionCode}-${dateIndex + 1}` : missionCode)
          : undefined;
        const res = await processGutmaBuffer(buf, entryName, params, null, entryCode, recurringGroupId, dateIndex, datesToProcess[dateIndex] ?? undefined);
        if ('error' in res) {
          if (res.duplicate) duplicates.push(res.error);
          else errors.push(res.error);
        } else {
          successes.push(res);
        }
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

  const droneSerialMap = new Map<number, string[]>();

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
      const serial = c.serial_number?.trim();
      if (c.fk_tool_id == null || !serial) return;
      const existing = droneSerialMap.get(c.fk_tool_id);
      if (existing) existing.push(serial);
      else droneSerialMap.set(c.fk_tool_id, [serial]);
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
    drone_serial_numbers: droneSerialMap.get(t.tool_id) ?? [],
  }));
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