import { env } from '@/backend/config/env';
import { getFlytbaseCredentials } from '@/backend/services/integrations/flytbase-service';
import { requireAuth } from '@/lib/auth/api-auth';
import { BUCKET, getPresignedDownloadUrl, s3 } from '@/lib/s3Client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const flightId = req.nextUrl.searchParams.get('flightId');
  if (!flightId) {
    return NextResponse.json({ success: false, message: 'flightId is required' }, { status: 400 });
  }

  const creds = await getFlytbaseCredentials(session!.user.userId);
  if (!creds) {
    return NextResponse.json(
      { success: false, message: 'No FlytBase integration configured.' },
      { status: 422 },
    );
  }

  const gutmaUrl = `${env.FLYTBASE_URL}/v2/flight/report/download/gutma?${new URLSearchParams({ flightIds: flightId })}`;
  const s3Key = `gutma/${session!.user.userId}/${flightId}.zip`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      console.log(`[preview SSE] start flightId=${flightId} url=${gutmaUrl} s3Key=${s3Key}`);

      try {
        console.log('[preview SSE] fetching GUTMA from FlytBase');

        const upstream = await fetch(gutmaUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${creds.token}`,
            'org-id': creds.orgId,
            'Cache-Control': 'no-cache',
          },
        });

        const ct = upstream.headers.get('content-type');
        const cl = upstream.headers.get('content-length');
        console.log(`[preview SSE] status=${upstream.status} content-type=${ct} content-length=${cl}`);

        if (!upstream.ok) {
          console.error(`[preview SSE] FlytBase error status=${upstream.status}`);
          send({ error: true, message: `FlytBase returned ${upstream.status}` });
          return;
        }

        const zipBuffer = Buffer.from(await upstream.arrayBuffer());
        console.log(`[preview SSE] ZIP bytes length=${zipBuffer.length}`);

        console.log(`[preview SSE] uploading to S3 key=${s3Key}`);
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: zipBuffer,
            ContentType: 'application/zip',
            ServerSideEncryption: 'AES256',
          }),
        );
        console.log('[preview SSE] S3 upload complete');

        const url = await getPresignedDownloadUrl(s3Key, 3600);
        console.log('[preview SSE] presigned URL generated, sending done event');

        send({ done: true, url });
      } catch (err: any) {
        console.error('[preview SSE] caught exception:', err?.message, err?.stack);
        send({ error: true, message: err?.message ?? 'Unknown error fetching GUTMA' });
      } finally {
        controller.close();
        console.log('[preview SSE] stream closed');
      }
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
