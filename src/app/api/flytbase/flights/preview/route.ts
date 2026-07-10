import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { getOrganizationCredentials } from '@/backend/services/integrations/flytbase-organization-service';
import { parseGutmaFlightPreview } from '@/backend/services/integrations/gutma-parser';
import { requireAuth } from '@/lib/auth/api-auth';
import { BUCKET, getPresignedDownloadUrl, getPresignedUploadUrl, s3 } from '@/lib/s3Client';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function gutmaFilename(flightId: string, gutma?: any): string {
  return gutma?.file?.filename ?? `FlytBase_Export_${flightId}.gutma`;
}

function s3Key(filename: string) {
  return `flytbase/gutma/${filename}`;
}

async function existsInS3(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const flightId = req.nextUrl.searchParams.get('flightId');
  const organizationIdParam = req.nextUrl.searchParams.get('organizationId');
  // const flightId = '6f5bbd84-2341-4b62-ab4c-852f3a416a0b';
  if (!flightId) {
    return NextResponse.json({ success: false, message: 'flightId is required' }, { status: 400 });
  }

  let creds;
  if (organizationIdParam) {
    const organizationId = parseInt(organizationIdParam, 10);
    if (isNaN(organizationId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid organization ID' },
        { status: 400 },
      );
    }
    creds = await getOrganizationCredentials(organizationId);
    if (!creds) {
      return NextResponse.json(
        { success: false, message: 'Organization not found or has no credentials' },
        { status: 404 },
      );
    }
  } else {
    creds = await getFlytbaseCredentials(session!.user.userId);
    if (!creds) {
      return NextResponse.json(
        { success: false, message: 'No FlytBase integration configured.' },
        { status: 422 },
      );
    }
  }

  const derivedKey = s3Key(gutmaFilename(flightId));
  const alreadyArchived = await existsInS3(derivedKey);
  if (alreadyArchived) {
    const presignedDownloadUrl = await getPresignedDownloadUrl(derivedKey, 900);
    const cached = await fetch(presignedDownloadUrl);
    const data = await cached.json();
    return NextResponse.json({ success: true, data, fromCache: true });
  }

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
    return NextResponse.json({ success: false, message: msg }, { status: 504 });
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    console.error(`FlytBase GUTMA download failed for flight ${flightId} (org: ${creds.orgId}): ${upstream.status} - ${errText}`);
    return NextResponse.json(
      { 
        success: false, 
        message: `FlytBase returned ${upstream.status}: ${errText.slice(0, 200)}`,
        flightId,
        organizationId: creds.orgId,
      },
      { status: upstream.status },
    );
  }

  let gutma: any;
  try {
    gutma = await upstream.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'GUTMA data unavailable for this flight.' },
      { status: 422 },
    );
  }

  const data = parseGutmaFlightPreview(flightId, gutma);
  const key  = s3Key(data.filename);

  const presignedUploadUrl = await getPresignedUploadUrl(key, 'application/json', 600);

  return NextResponse.json({
    success: true,
    data,
    presignedUploadUrl,
    s3Key: key,
    fromCache: false,
  });
}
