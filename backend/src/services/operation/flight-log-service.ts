'use server';

import { env } from '@/backend/config/env';
import { prisma } from '@/lib/prisma';
import { getFlytbaseCredentials, getFlytbaseCredentialsForCompany } from '@/backend/services/integrations/flytbase-service';
import { getOrganizationCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { GutmaWaypoint, parseGutmaFlightData } from '@/backend/services/integrations/gutma-parser';
import { BUCKET, getPresignedDownloadUrl, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

export interface FlightLog {
  log_id: number;
  log_source: 'manual' | 'flytbase';
  original_filename: string;
  flytbase_flight_id: string | null;
  uploaded_at: string;
  download_url: string;
}

export async function getFlightLogsForMission(missionId: number): Promise<FlightLog[]> {
  const data = await prisma.mission_flight_logs.findMany({
    where: { fk_mission_id: BigInt(missionId) },
    orderBy: { uploaded_at: 'desc' },
    select: {
      log_id: true,
      log_source: true,
      original_filename: true,
      flytbase_flight_id: true,
      uploaded_at: true,
      s3_key: true,
    },
  });

  return Promise.all(
    data.map(async (log) => ({
      log_id: Number(log.log_id),
      log_source: log.log_source as 'manual' | 'flytbase',
      original_filename: log.original_filename ?? '',
      flytbase_flight_id: log.flytbase_flight_id ?? null,
      uploaded_at: log.uploaded_at?.toISOString() ?? '',
      download_url: await getPresignedDownloadUrl(log.s3_key, 3600),
    }))
  );
}

export interface FlightLogWaypointsResult {
  log_id: number;
  original_filename: string;
  waypoints: GutmaWaypoint[];
}

/**
 * Reads the most recently attached/uploaded flight log for a mission 
 * and parses its GUTMA waypoints for use in the Flight Path Map.
 */
export async function getFlightLogWaypoints(missionId: number): Promise<FlightLogWaypointsResult | null> {
  const log = await prisma.mission_flight_logs.findFirst({
    where: { fk_mission_id: BigInt(missionId) },
    orderBy: { uploaded_at: 'desc' },
    select: { log_id: true, s3_key: true, original_filename: true },
  });
  if (!log) return null;

  const downloadUrl = await getPresignedDownloadUrl(log.s3_key, 300);
  const res = await fetch(downloadUrl);
  if (!res.ok) return null;

  let raw: any;
  try {
    raw = await res.json();
  } catch {
    return null;
  }

  const parsed = parseGutmaFlightData(raw);
  if (parsed.waypoints.length === 0) return null;

  return {
    log_id: Number(log.log_id),
    original_filename: log.original_filename ?? '',
    waypoints: parsed.waypoints,
  };
}

const ALLOWED_EXTENSIONS = ['.zip', '.json', '.xml', '.gutma'];

async function getDroneSerialNumberForMission(missionId: number): Promise<string | null> {
  const mission = await prisma.pilot_mission.findUnique({
    where: { pilot_mission_id: missionId },
    select: { fk_tool_id: true },
  });

  if (!mission?.fk_tool_id) return null;

  const droneComponent = await prisma.tool_component.findFirst({
    where: {
      fk_tool_id: mission.fk_tool_id,
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

function extractSerialNumberFromGutma(gutma: any): string | null {
  const sn = parseGutmaFlightData(gutma).aircraft?.serial_number;
  return typeof sn === 'string' ? sn.trim() || null : null;
}

/** Parses the GUTMA JSON payload out of a manually uploaded file (.gutma/.json direct, or the first such entry inside a .zip). */
async function parseGutmaJsonFromFile(file: File): Promise<any | null> {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  const buffer = await file.arrayBuffer();

  if (ext === '.gutma' || ext === '.json') {
    try {
      return JSON.parse(new TextDecoder().decode(buffer));
    } catch {
      return null;
    }
  }

  if (ext === '.zip') {
    try {
      const zip = await JSZip.loadAsync(buffer);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (!entry.dir && (name.endsWith('.gutma') || name.endsWith('.json'))) {
          const buf = await entry.async('arraybuffer');
          try {
            return JSON.parse(new TextDecoder().decode(buf));
          } catch {
            continue;
          }
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

/** Reads the drone serial number (and raw aircraft block) out of an uploaded log file, without persisting anything — used to surface it in the UI before the mission is created/attached. */
export async function previewUploadedFlightLog(
  file: File
): Promise<{ serial_number: string | null; aircraft: Record<string, any> | null }> {
  const gutma = await parseGutmaJsonFromFile(file);
  if (!gutma) return { serial_number: null, aircraft: null };

  const parsed = parseGutmaFlightData(gutma);
  const sn = parsed.aircraft?.serial_number;
  return {
    serial_number: typeof sn === 'string' ? sn.trim() || null : null,
    aircraft: parsed.aircraft ?? null,
  };
}

/** Syncs a mission's post-flight fields (actual start/end, duration, distance, battery) from a parsed GUTMA payload, since an attached log means the flight already happened. */
async function syncMissionFromGutma(missionId: number, gutma: any): Promise<void> {
  const parsed = parseGutmaFlightData(gutma);
  const missionUpdate: Record<string, unknown> = {};

  const startMs = parsed.start_time ? new Date(parsed.start_time).getTime() : NaN;
  const endMs = parsed.end_time ? new Date(parsed.end_time).getTime() : NaN;

  if (!isNaN(startMs)) missionUpdate.actual_start = new Date(startMs);
  if (!isNaN(endMs)) missionUpdate.actual_end = new Date(endMs);
  if (!isNaN(startMs) && !isNaN(endMs) && endMs > startMs) {
    missionUpdate.flight_duration = Math.round((endMs - startMs) / 60000);
  }
  if (parsed.distance_m != null) missionUpdate.distance_flown = parsed.distance_m;
  if (parsed.battery_charge_start != null) missionUpdate.battery_charge_start = parsed.battery_charge_start;
  if (parsed.battery_charge_end != null) missionUpdate.battery_charge_end = parsed.battery_charge_end;

  if (Object.keys(missionUpdate).length > 0) {
    await prisma.pilot_mission.update({
      where: { pilot_mission_id: missionId },
      data: missionUpdate,
    });
  }
}

async function extractSerialNumberFromFile(file: File): Promise<string | null> {
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  const buffer = await file.arrayBuffer();

  if (ext === '.gutma' || ext === '.json') {
    try {
      const parsed = JSON.parse(new TextDecoder().decode(buffer));
      return extractSerialNumberFromGutma(parsed);
    } catch {
      return null;
    }
  }

  if (ext === '.zip') {
    try {
      const zip = await JSZip.loadAsync(buffer);
      for (const [name, entry] of Object.entries(zip.files)) {
        if (!entry.dir && (name.endsWith('.gutma') || name.endsWith('.json'))) {
          const buf = await entry.async('arraybuffer');
          try {
            const parsed = JSON.parse(new TextDecoder().decode(buf));
            const sn = extractSerialNumberFromGutma(parsed);
            if (sn) return sn;
          } catch {
            continue;
          }
        }
      }
    } catch {
      return null;
    }
  }

  if (ext === '.xml') {
    try {
      const text = new TextDecoder().decode(buffer);
      const snMatch = text.match(/<serialNumber[^>]*>([^<]+)<\/serialNumber>/i) ||
                     text.match(/<serial_number[^>]*>([^<]+)<\/serial_number>/i) ||
                     text.match(/serialNumber[\s]*=[\s]*"([^"]+)"/i);
      return snMatch?.[1]?.trim() || null;
    } catch {
      return null;
    }
  }

  return null;
}

export async function uploadManualFlightLog(
  missionId: number,
  userId: number,
  file: File
): Promise<void> {
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('File too large (max 50 MB)');

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Validate serial number from log matches mission's drone
  const missionDroneSn = await getDroneSerialNumberForMission(missionId);
  if (missionDroneSn) {
    const logSn = await extractSerialNumberFromFile(file);
    if (logSn && logSn.toLowerCase() !== missionDroneSn.toLowerCase()) {
      throw new Error(`No system is present with the serial number ${logSn}`);
    }
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const s3Key = `flight-logs/mission/${missionId}/${Date.now()}_${safe}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
      ContentDisposition: `attachment; filename="${file.name}"`,
      ServerSideEncryption: 'AES256',
    })
  );

  await prisma.mission_flight_logs.create({
    data: {
      fk_mission_id: BigInt(missionId),
      log_source: 'manual',
      s3_key: s3Key,
      original_filename: file.name,
      uploaded_by: BigInt(userId),
    },
  });

  try {
    const gutma = await parseGutmaJsonFromFile(file);
    if (gutma) await syncMissionFromGutma(missionId, gutma);
  } catch (err) {
    // Best-effort — a parsing/sync failure shouldn't fail the upload itself.
    console.error('[uploadManualFlightLog] GUTMA mission sync failed:', err);
  }
}

export async function attachFlytbaseFlightLog(
  missionId: number,
  userId: number,
  ownerId: number,
  flightId: string,
  organizationId: number | null = null
): Promise<void> {
  const creds = organizationId
    ? await getOrganizationCredentials(organizationId)
    : (await getFlytbaseCredentials(userId)) ?? (await getFlytbaseCredentialsForCompany(ownerId, userId));
  if (!creds) throw new Error('No FlytBase integration configured. Please add your API token first.');

  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;

  let upstream: Response;
  try {
    upstream = await fetch(gutmaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'org-id': creds.orgId,
      },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err: any) {
    const msg = err?.name === 'TimeoutError'
      ? 'No GUTMA data available for this flight.'
      : 'Failed to reach FlytBase.';
    throw Object.assign(new Error(msg), { code: 'FLYTBASE_TIMEOUT' });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    throw new Error(`FlytBase returned ${upstream.status}: ${errText.slice(0, 200)}`);
  }

  let gutma: any;
  try {
    gutma = await upstream.json();
  } catch {
    throw new Error('GUTMA data unavailable for this flight.');
  }

  // Block when the GUTMA log's aircraft doesn't match the mission's assigned
  // drone — a log from one drone must never be attached to a different one.
  const missionDroneSn = await getDroneSerialNumberForMission(missionId);
  if (missionDroneSn) {
    const logSn = extractSerialNumberFromGutma(gutma);
    if (logSn && logSn.toLowerCase() !== missionDroneSn.toLowerCase()) {
      throw new Error(`No system is present with the serial number ${logSn}`);
    }
  }

  const filename: string = gutma?.file?.filename ?? `FlytBase_Export_${flightId}.gutma`;
  const s3Key = `flight-logs/mission/${missionId}/${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: JSON.stringify(gutma),
      ContentType: 'application/json',
      ContentDisposition: `attachment; filename="${filename}"`,
      ServerSideEncryption: 'AES256',
    })
  );

  await prisma.mission_flight_logs.create({
    data: {
      fk_mission_id: BigInt(missionId),
      log_source: 'flytbase',
      s3_key: s3Key,
      original_filename: filename,
      flytbase_flight_id: flightId,
      uploaded_by: BigInt(userId),
    },
  });

  // Prefill the mission's post-flight fields from the GUTMA log so Edit
  // Mission's Mission Log / Post Flight tabs reflect the attached flight
  // without requiring a separate manual sync step.
  try {
    await syncMissionFromGutma(missionId, gutma);
  } catch (err) {
    // Best-effort — a parsing/sync failure shouldn't fail the attach itself.
    console.error('[attachFlytbaseFlightLog] GUTMA mission sync failed:', err);
  }
}
