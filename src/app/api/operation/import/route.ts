import { importMissionFromLog } from '@/backend/services/operation/importOperation-service';
import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { requirePermission } from '@/lib/auth/api-auth';
import { internalError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { NextRequest, NextResponse } from 'next/server';

async function fetchFlytbaseGutmaFile(userId: number, flightId: string): Promise<File> {
  const creds = await getFlytbaseCredentials(userId);
  if (!creds) throw new Error('No FlytBase integration configured.');

  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;
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
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requirePermission('view_operations');
    if (error) return error;

    const ownerId = session!.user.ownerId;
    const formData = await req.formData();

    const requestedFile = formData.get('mission_file_log') as File | null;
    const flytbaseFlightId = String(formData.get('flytbase_flight_id') ?? '').trim();

    let file: File | null = requestedFile;
    if (!file && flytbaseFlightId) {
      file = await fetchFlytbaseGutmaFile(session!.user.userId, flytbaseFlightId);
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
      statusId:   Number(formData.get('mission_status'))       || 0,
      resultId:   Number(formData.get('mission_result'))       || 0,
      pilotId:    Number(formData.get('pilot_id'))             || 0,
      location:   String(formData.get('mission_location')     ?? ''),
      groupLabel: String(formData.get('mission_group_label')  ?? ''),
      notes:      String(formData.get('mission_notes')        ?? ''),
    };

    const result = await importMissionFromLog(file, params);

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
