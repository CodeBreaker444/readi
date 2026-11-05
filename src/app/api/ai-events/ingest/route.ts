import { env } from '@/backend/config/env';
import { aiEventPayloadSchema, ingestAiEvent, processAiEvent } from '@/backend/services/logbook/ai-event-service';
import { apiError } from '@/lib/api-error';
import { E } from '@/lib/error-codes';
import { describeIngestFailure } from '@/lib/ai-event-errors';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { after, NextRequest, NextResponse } from 'next/server';

const sha = (v: string) => createHash('sha256').update(v).digest();

/** Constant-time comparison of the api key header with the platform key from the environment. */
function checkKey(provided: string | null): 'ok' | 'missing' | 'invalid' | 'not_configured' {
  const expected = env.AI_EVENTS_API_KEY;
  if (!expected) return 'not_configured';
  if (!provided) return 'missing';
  return timingSafeEqual(sha(provided), sha(expected)) ? 'ok' : 'invalid';
}

/**
 * Receives events from the AI model. The model is not tied to a company, so it authenticates with
 * one platform key. The event is stored as it is; a company sees it once an admin
 * adds the event's stream id. The alert email is sent after the response so the model is never held up.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = checkKey(request.headers.get('x-api-key'));
    if (auth === 'not_configured') {
      return NextResponse.json({ code: 0, status: 'ERROR', error: 'AI events ingestion is not configured on this server' }, { status: 503 });
    }
    if (auth === 'missing') return NextResponse.json({ code: 0, status: 'ERROR', error: 'Missing X-API-KEY header' }, { status: 401 });
    if (auth === 'invalid') return NextResponse.json({ code: 0, status: 'ERROR', error: 'Invalid API key' }, { status: 401 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ code: 0, error: 'Body must be valid JSON' }, { status: 400 });
    }

    const parsed = aiEventPayloadSchema.safeParse(body);
    if (!parsed.success) {
      // Keyed by full path ("ai_processed_img.s3_key"), so the model team can see exactly which field is wrong.
      const errors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) (errors[issue.path.join('.') || '_body'] ??= []).push(issue.message);
      return apiError(E.VL001, 400, errors);
    }

    const { aiEventId, duplicate, claimed, imageIssues } = await ingestAiEvent(parsed.data);
    if (!duplicate) after(() => processAiEvent(aiEventId));

    // The event is kept even when an image is missing (the detection data is still valuable); the
    // sender is told exactly which image is missing and why so it can fix its upload.
    return NextResponse.json(
      { code: 200, ai_event_id: aiEventId, duplicate, claimed, ...(imageIssues.length ? { image_warnings: imageIssues } : {}) },
      { status: duplicate ? 200 : 201 },
    );
  } catch (err) {
    // The full error stays in the server log under a reference; the sender gets a message it can act on.
    const reference = randomUUID().slice(0, 8);
    const f = describeIngestFailure(err, reference);
    if (f.reference) console.error(`[ai-events] ingest failed (ref ${reference})`, err);
    return NextResponse.json(
      { code: 0, status: 'ERROR', error: f.error, errorCode: f.errorCode, retryable: f.retryable, ...(f.reference ? { reference: f.reference } : {}) },
      { status: f.status },
    );
  }
}
