import { importMissionFromLog } from '@/backend/services/operation/importOperation-service';
import { env } from '@/backend/config/env';
import { getFlytbaseCredentials, getFlytbaseCredentialsForCompany } from '@/backend/services/integrations/flytbase-service';
import { getOrganizationCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

const GUTMA_DOWNLOAD_MAX_ATTEMPTS = 5;
const GUTMA_DOWNLOAD_RETRY_DELAY_MS = 1_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFlytbaseGutmaFile(
  userId: number,
  ownerId: number,
  flightId: string,
  organizationId: number | null
): Promise<File> {
  const creds = organizationId
    ? await getOrganizationCredentials(organizationId)
    : (await getFlytbaseCredentials(userId)) ?? (await getFlytbaseCredentialsForCompany(ownerId, userId));
  if (!creds) throw new Error('No FlytBase integration configured.');

  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= GUTMA_DOWNLOAD_MAX_ATTEMPTS; attempt++) {
    try {
      const upstream = await fetch(gutmaUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'org-id': creds.orgId,
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '');
        throw new Error(`FlytBase returned ${upstream.status}: ${errText.slice(0, 200)}`);
      }

      const payload = await upstream.text();
      const filename = `FlytBase_Export_${flightId}.gutma`;
      return new File([payload], filename, { type: 'application/json' });
    } catch (err) {
      lastError = err;
      console.error(`[fetchFlytbaseGutmaFile] attempt ${attempt}/${GUTMA_DOWNLOAD_MAX_ATTEMPTS} failed`, err);
      if (attempt < GUTMA_DOWNLOAD_MAX_ATTEMPTS) {
        await sleep(GUTMA_DOWNLOAD_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw new Error(
    `Failed to download flight log from FlytBase after ${GUTMA_DOWNLOAD_MAX_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const formData = await req.formData();

    const requestedFile = formData.get('mission_file_log') as File | null;
    const flytbaseFlightId = String(formData.get('flytbase_flight_id') ?? '').trim();
    const organizationIdRaw = String(formData.get('organization_id') ?? '').trim();
    const organizationId = organizationIdRaw ? Number(organizationIdRaw) || null : null;

    let file: File | null = requestedFile;
    if (!file && flytbaseFlightId) {
      file = await fetchFlytbaseGutmaFile(session!.user.userId, ownerId, flytbaseFlightId, organizationId);
    }
    if (!file) {
      return NextResponse.json({ code: 0, message: 'No file or FlytBase flight selected' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['gutma', 'zip'].includes(ext ?? '')) {
      return NextResponse.json(
        { code: 0, message: `Invalid file type: .${ext}. Only .gutma or .zip allowed.` },
        { status: 400 }
      );
    }

    const params = {
      ownerId,
      clientId:   Number(formData.get('client_id'))           || 0,
      platform:   String(formData.get('mission_ccPlatform')   ?? 'FLYTBASE'),
      vehicleId:  Number(formData.get('mission_vehicle'))      || 0,
      categoryId: Number(formData.get('mission_category'))     || 0,
      typeId:     Number(formData.get('mission_type'))         || 0,
      planId:     formData.get('mission_plan') === 'N'
                    ? null : Number(formData.get('mission_plan')) || null,
      missionPlanningId: formData.get('mission_planning') === 'N'
                    ? null : Number(formData.get('mission_planning')) || null,
      resultId:   Number(formData.get('mission_result'))       || 0,
      pilotId:    Number(formData.get('pilot_id'))             || 0,
      visualObserverIds: formData.getAll('visual_observer_ids').map(id => Number(id)).filter(id => !isNaN(id) && id > 0),
      lucProcedureId: Number(formData.get('mission_luc_procedure')) || null,
      location:   String(formData.get('mission_location')     ?? ''),
      groupLabel: String(formData.get('mission_group_label')  ?? ''),
      notes:      String(formData.get('mission_notes')        ?? ''),
      flightMode: String(formData.get('flight_mode')          ?? '').trim() || null,
      userId:     session!.user.userId,
      missionCode: String(formData.get('mission_code') ?? '').trim() || undefined,
      userTimezone: session!.user.timezone || undefined,
      isRecurrent: String(formData.get('is_recurrent')) === 'true',
      recurrentStartDate: String(formData.get('recurrent_start_date') ?? ''),
      recurrentEndDate: String(formData.get('recurrent_end_date') ?? ''),
      recurrentTime: String(formData.get('recurrent_time') ?? ''),
    };

    const result = await importMissionFromLog(file, params, flytbaseFlightId || null);

    for (const op of result.operations) {
      logEvent({
        eventType: 'CREATE',
        entityType: 'operation',
        entityId: op.pilot_mission_id,
        description: `Imported mission ${op.mission_code ?? `#${op.mission_code}`} from flight log on Operations table`,
        userId: session!.user.userId,
        userName: session!.user.fullname,
        userEmail: session!.user.email,
        userRole: session!.user.role,
        ownerId,
        metadata: { flytbase_flight_id: flytbaseFlightId || undefined, source_file: file.name },
      });
    }

    return NextResponse.json({
      code: 1,
      status: 'SUCCESS',
      newMissionIds: result.newMissionIds,
      operations:    result.operations,
      skipped:       result.skipped,
    });
  } catch (err) {
    console.error('[POST /api/operation/import]', err);
    return internalError(E.SV001, err);
  }
}
