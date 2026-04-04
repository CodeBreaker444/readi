'use server';

import { env } from '@/backend/config/env';
import { supabase } from '@/backend/database/database';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { BUCKET, getPresignedDownloadUrl, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface FlightLog {
  log_id: number;
  log_source: 'manual' | 'flytbase';
  original_filename: string;
  flytbase_flight_id: string | null;
  uploaded_at: string;
  download_url: string;
}

export async function getFlightLogsForMission(missionId: number): Promise<FlightLog[]> {
  const { data, error } = await supabase
    .from('mission_flight_logs')
    .select('log_id, log_source, original_filename, flytbase_flight_id, uploaded_at, s3_key')
    .eq('fk_mission_id', missionId)
    .order('uploaded_at', { ascending: false });

  if (error) throw new Error(error.message);

  return Promise.all(
    (data ?? []).map(async (log) => ({
      log_id: log.log_id,
      log_source: log.log_source as 'manual' | 'flytbase',
      original_filename: log.original_filename,
      flytbase_flight_id: log.flytbase_flight_id,
      uploaded_at: log.uploaded_at,
      download_url: await getPresignedDownloadUrl(log.s3_key, 3600),
    }))
  );
}

const ALLOWED_EXTENSIONS = ['.zip', '.json', '.xml', '.gutma'];

export async function uploadManualFlightLog(
  missionId: number,
  userId: number,
  file: File,
): Promise<void> {
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('File too large (max 50 MB)');

  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
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

  const { error } = await supabase.from('mission_flight_logs').insert({
    fk_mission_id: missionId,
    log_source: 'manual',
    s3_key: s3Key,
    original_filename: file.name,
    uploaded_by: userId,
  });

  if (error) throw new Error(error.message);
}

export async function attachFlytbaseFlightLog(
  missionId: number,
  userId: number,
  flightId: string,
): Promise<void> {
  const creds = await getFlytbaseCredentials(userId);
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

  const { error } = await supabase.from('mission_flight_logs').insert({
    fk_mission_id: missionId,
    log_source: 'flytbase',
    s3_key: s3Key,
    original_filename: filename,
    flytbase_flight_id: flightId,
    uploaded_by: userId,
  });

  if (error) throw new Error(error.message);
}
