import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { DccCallbackResult } from '@/types/dcc-callback';
import { getDccCallbackUrl } from './dcc-settings-service';
import { isRetryableResult, sendDccRequest } from './dcc-http';

/** Seconds to wait after attempt N fails (index N-1). After the last entry the item is marked FAILED. */
const BACKOFF_SECONDS = [60, 300, 1800, 7200, 21600];
const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;
/** Lease while a worker is sending, so two cron runs don't double-send. */
const CLAIM_SECONDS = 120;

export interface DccTargetRef {
  clientId?: number | null;
  strict?: boolean;
}

function addSeconds(s: number): Date {
  return new Date(Date.now() + s * 1000);
}

/** Records a failed first attempt: retryable ones are scheduled, the rest wait for a manual resend. */
export async function enqueueFailedCallback(
  ownerId: number,
  path: string,
  body: unknown,
  target: DccTargetRef,
  result: DccCallbackResult,
): Promise<void> {
  try {
    const retry = isRetryableResult(result);
    await prisma.dcc_callback_outbox.create({
      data: {
        fk_owner_id: ownerId,
        fk_client_id: target.clientId ?? null,
        strict: target.strict ?? false,
        path,
        body: body === undefined ? Prisma.JsonNull : (body as Prisma.InputJsonValue),
        status: retry ? 'PENDING' : 'FAILED',
        attempts: 1,
        next_attempt_at: retry ? addSeconds(BACKOFF_SECONDS[0]) : null,
        last_http_status: result.httpStatus ?? null,
        last_error: result.message,
      },
    });
  } catch (err: any) {
    // Never let bookkeeping break the user's action.
    console.error('[DCC outbox] enqueue failed:', err?.message ?? err);
  }
}

type OutboxRow = NonNullable<Awaited<ReturnType<typeof prisma.dcc_callback_outbox.findFirst>>>;

/** One send for an outbox row. Re-resolves the URL so config changes since the failure are honoured. */
async function attempt(row: OutboxRow): Promise<DccCallbackResult> {
  const base = await getDccCallbackUrl(row.fk_owner_id, row.fk_client_id, row.strict);
  if (!base) {
    return { path: row.path, outcome: 'skipped', message: 'No callback URL configured any more' };
  }
  const url = `${base.replace(/\/$/, '')}${row.path}`;
  return sendDccRequest(url, row.path, row.body ?? undefined);
}

async function recordResult(row: OutboxRow, result: DccCallbackResult, auto: boolean): Promise<void> {
  const attempts = row.attempts + 1;
  const base = { attempts, last_http_status: result.httpStatus ?? null, updated_at: new Date() };

  if (result.outcome === 'success') {
    await prisma.dcc_callback_outbox.update({
      where: { id: row.id },
      data: { ...base, status: 'SUCCESS', next_attempt_at: null, last_error: null },
    });
    return;
  }

  const willRetry = auto && isRetryableResult(result) && attempts < MAX_ATTEMPTS;
  await prisma.dcc_callback_outbox.update({
    where: { id: row.id },
    data: {
      ...base,
      status: willRetry ? 'PENDING' : 'FAILED',
      next_attempt_at: willRetry ? addSeconds(BACKOFF_SECONDS[attempts - 1]) : null,
      last_error: result.message,
    },
  });
}

/** Cron entry point: sends every due PENDING callback. */
export async function processDccOutbox(limit = 50): Promise<{ processed: number; succeeded: number }> {
  const due = await prisma.dcc_callback_outbox.findMany({
    where: { status: 'PENDING', next_attempt_at: { lte: new Date() } },
    orderBy: { next_attempt_at: 'asc' },
    take: limit,
  });

  let succeeded = 0;
  let processed = 0;
  for (const row of due) {
    // Claim: only proceed if nobody else moved next_attempt_at since we read it.
    const claimed = await prisma.dcc_callback_outbox.updateMany({
      where: { id: row.id, status: 'PENDING', next_attempt_at: row.next_attempt_at },
      data: { next_attempt_at: addSeconds(CLAIM_SECONDS) },
    });
    if (claimed.count !== 1) continue;

    processed++;
    const result = await attempt(row);
    await recordResult(row, result, true);
    if (result.outcome === 'success') succeeded++;
  }
  return { processed, succeeded };
}

export interface DccOutboxItem {
  id: number;
  client_name: string | null;
  path: string;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  last_http_status: number | null;
  last_error: string | null;
  created_at: string;
}

/** Callbacks that still need attention (pending retry or failed) for the owner. */
export async function listDccOutbox(ownerId: number): Promise<DccOutboxItem[]> {
  const rows = await prisma.dcc_callback_outbox.findMany({
    where: { fk_owner_id: ownerId, status: { in: ['PENDING', 'FAILED'] } },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
  const ids = [...new Set(rows.map((r) => r.fk_client_id).filter((v): v is number => v != null))];
  const clients = ids.length
    ? await prisma.client.findMany({
        where: { client_id: { in: ids }, fk_owner_id: ownerId },
        select: { client_id: true, client_name: true },
      })
    : [];
  const names = new Map(clients.map((c) => [c.client_id, c.client_name]));

  return rows.map((r) => ({
    id: r.id,
    client_name: r.fk_client_id ? names.get(r.fk_client_id) ?? `Client #${r.fk_client_id}` : null,
    path: r.path,
    status: r.status,
    attempts: r.attempts,
    next_attempt_at: r.next_attempt_at?.toISOString() ?? null,
    last_http_status: r.last_http_status,
    last_error: r.last_error,
    created_at: r.created_at.toISOString(),
  }));
}

/** Manual resend of one item. Returns null if it doesn't exist / isn't this owner's / is already delivered. */
export async function resendDccOutboxItem(ownerId: number, id: number): Promise<DccCallbackResult | null> {
  const row = await prisma.dcc_callback_outbox.findFirst({
    where: { id, fk_owner_id: ownerId, status: { in: ['PENDING', 'FAILED'] } },
  });
  if (!row) return null;
  const result = await attempt(row);
  await recordResult(row, result, false);
  return result;
}
