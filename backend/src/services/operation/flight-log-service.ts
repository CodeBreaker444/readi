'use server';

import { env } from '@/backend/config/env';
import { prisma } from '@/lib/prisma';
import { getFlytbaseCredentials, getFlytbaseCredentialsForCompany } from '@/backend/services/integrations/flytbase-service';
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
  const sn = gutma?.aircraft?.serial_number || gutma?.flight?.aircraft?.serial_number;
  return sn?.trim() || null;
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
      throw new Error(
        `Serial number mismatch: Log contains serial number "${logSn}" but mission is assigned to drone with serial number "${missionDroneSn}"`
      );
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
}

export async function attachFlytbaseFlightLog(
  missionId: number,
  userId: number,
  ownerId: number,
  flightId: string
): Promise<void> {
  const creds =
    (await getFlytbaseCredentials(userId)) ??
    (await getFlytbaseCredentialsForCompany(ownerId, userId));
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

  // Validate serial number from GUTMA matches mission's drone
  const missionDroneSn = await getDroneSerialNumberForMission(missionId);
  if (missionDroneSn) {
    const logSn = extractSerialNumberFromGutma(gutma);
    if (logSn && logSn.toLowerCase() !== missionDroneSn.toLowerCase()) {
      throw new Error(
        `Serial number mismatch: FlytBase log contains serial number "${logSn}" but mission is assigned to drone with serial number "${missionDroneSn}"`
      );
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
}
