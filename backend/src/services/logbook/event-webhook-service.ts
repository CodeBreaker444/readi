import 'server-only';

import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventType, type EventWebhookConfigItem, type EventWebhookDeliveryItem } from '@/config/types/event-logbook';
import { decryptToken, encryptToken } from '@/backend/utils/token-encryption';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { createHmac, randomBytes, randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { z } from 'zod';
import { EventLogbookError } from './event-logbook-service';

const DELIVERY_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 2;
// S3 presigned URLs are valid for at most 7 days; the client needs time to fetch the screenshots.
const ATTACHMENT_URL_TTL_S = 7 * 24 * 60 * 60;

export const webhookInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  url: z.string().trim().url().max(2000),
  client_id: z.number().int().positive().nullable().optional(),
  event_types: z.array(z.enum(EVENT_TYPES)).default([]),
  is_active: z.boolean().optional(),
});
export type WebhookInput = z.infer<typeof webhookInputSchema>;

// ── SSRF protection ──────────────────────────────────────────────────────────

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Rejects non-HTTPS URLs and hosts that resolve to private/loopback/link-local addresses. */
async function assertPublicHttpsUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new EventLogbookError('Invalid webhook URL');
  }
  if (parsed.protocol !== 'https:') throw new EventLogbookError('Webhook URL must use HTTPS');
  if (parsed.username || parsed.password) throw new EventLogbookError('Webhook URL must not contain credentials');

  const host = parsed.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((r) => r.address);
  if (addresses.length === 0) throw new EventLogbookError('Webhook host could not be resolved');
  if (addresses.some(isPrivateAddress)) throw new EventLogbookError('Webhook URL must point to a public host');
}


function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

async function assertClientInOwner(ownerId: number, clientId: number | null | undefined) {
  if (!clientId) return;
  const client = await prisma.client.findFirst({ where: { client_id: clientId, fk_owner_id: ownerId }, select: { client_id: true } });
  if (!client) throw new EventLogbookError('Client not found', 404);
}

export async function listWebhooks(ownerId: number): Promise<EventWebhookConfigItem[]> {
  const configs = await prisma.event_webhook_config.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { webhook_id: 'asc' },
    include: { event_webhook_delivery: { orderBy: { delivery_id: 'desc' }, take: 1 } },
  });
  const clientIds = configs.map((c) => c.fk_client_id).filter((v): v is number => v != null);
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } })
    : [];
  const clientMap = new Map(clients.map((c) => [c.client_id, c.client_name]));

  return configs.map((c) => {
    const last = c.event_webhook_delivery[0];
    return {
      webhook_id: c.webhook_id,
      name: c.name,
      url: c.url,
      fk_client_id: c.fk_client_id,
      client_name: c.fk_client_id ? (clientMap.get(c.fk_client_id) ?? null) : null,
      event_types: c.event_types,
      is_active: c.is_active,
      created_at: c.created_at.toISOString(),
      last_delivery: last
        ? { success: last.success, response_status: last.response_status, created_at: last.created_at.toISOString() }
        : null,
    };
  });
}

/** Returns the signing secret exactly once; it is only stored encrypted afterwards. */
export async function createWebhook(ownerId: number, userId: number, input: WebhookInput) {
  await assertPublicHttpsUrl(input.url);
  await assertClientInOwner(ownerId, input.client_id);
  const secret = generateSecret();
  const row = await prisma.event_webhook_config.create({
    data: {
      fk_owner_id: ownerId,
      fk_client_id: input.client_id ?? null,
      name: input.name,
      url: input.url,
      secret_encrypted: encryptToken(secret),
      event_types: input.event_types,
      is_active: input.is_active ?? true,
      created_by: userId,
    },
    select: { webhook_id: true },
  });
  return { webhook_id: row.webhook_id, secret };
}

async function getOwnedWebhook(ownerId: number, webhookId: number) {
  const row = await prisma.event_webhook_config.findFirst({ where: { webhook_id: webhookId, fk_owner_id: ownerId } });
  if (!row) throw new EventLogbookError('Webhook not found', 404);
  return row;
}

export async function updateWebhook(ownerId: number, webhookId: number, input: Partial<WebhookInput>) {
  await getOwnedWebhook(ownerId, webhookId);
  if (input.url) await assertPublicHttpsUrl(input.url);
  if (input.client_id !== undefined) await assertClientInOwner(ownerId, input.client_id);

  await prisma.event_webhook_config.update({
    where: { webhook_id: webhookId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: input.url } : {}),
      ...(input.client_id !== undefined ? { fk_client_id: input.client_id } : {}),
      ...(input.event_types !== undefined ? { event_types: input.event_types } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      updated_at: new Date(),
    },
  });
}

export async function rotateWebhookSecret(ownerId: number, webhookId: number) {
  await getOwnedWebhook(ownerId, webhookId);
  const secret = generateSecret();
  await prisma.event_webhook_config.update({
    where: { webhook_id: webhookId },
    data: { secret_encrypted: encryptToken(secret), updated_at: new Date() },
  });
  return { secret };
}

export async function deleteWebhook(ownerId: number, webhookId: number) {
  await getOwnedWebhook(ownerId, webhookId);
  await prisma.event_webhook_config.delete({ where: { webhook_id: webhookId } });
}

export async function listDeliveries(ownerId: number, webhookId: number): Promise<EventWebhookDeliveryItem[]> {
  await getOwnedWebhook(ownerId, webhookId);
  const rows = await prisma.event_webhook_delivery.findMany({
    where: { fk_webhook_id: webhookId },
    orderBy: { delivery_id: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    delivery_id: r.delivery_id,
    fk_event_id: r.fk_event_id,
    is_test: r.is_test,
    success: r.success,
    response_status: r.response_status,
    error_message: r.error_message,
    duration_ms: r.duration_ms,
    created_at: r.created_at.toISOString(),
  }));
}

// ── Delivery ─────────────────────────────────────────────────────────────────

interface DeliveryTarget {
  webhook_id: number;
  url: string;
  secret_encrypted: string;
}

async function deliver(
  target: DeliveryTarget,
  eventName: string,
  payload: Record<string, unknown>,
  meta: { eventId: number | null; isTest: boolean },
) {
  const deliveryId = randomUUID();
  const body = JSON.stringify({ id: deliveryId, type: eventName, created_at: new Date().toISOString(), data: payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', decryptToken(target.secret_encrypted)).update(`${timestamp}.${body}`).digest('hex');

  let success = false;
  let status: number | null = null;
  let error: string | null = null;
  const started = Date.now();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !success; attempt++) {
    try {
      // Re-validate at send time to defend against DNS changes after the config was saved.
      await assertPublicHttpsUrl(target.url);
      const res = await fetch(target.url, {
        method: 'POST',
        redirect: 'manual',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ReADI-Webhooks/1.0',
          'X-Readi-Event': eventName,
          'X-Readi-Delivery': deliveryId,
          'X-Readi-Timestamp': timestamp,
          'X-Readi-Signature': `sha256=${signature}`,
        },
        body,
      });
      status = res.status;
      success = res.ok;
      error = success ? null : `HTTP ${res.status}`;
      // Only retry transient failures.
      if (!success && res.status < 500) break;
    } catch (err) {
      error = err instanceof Error ? err.message.slice(0, 500) : 'Delivery failed';
    }
  }

  await prisma.event_webhook_delivery
    .create({
      data: {
        fk_webhook_id: target.webhook_id,
        fk_event_id: meta.eventId,
        is_test: meta.isTest,
        success,
        response_status: status,
        error_message: error,
        duration_ms: Date.now() - started,
      },
    })
    .catch((e) => console.error('[event-webhook] failed to record delivery', e));

  return { success, status, error };
}

async function buildEventPayload(eventId: number) {
  const event = await prisma.pilot_event.findUnique({ where: { event_id: eventId }, include: { pilot_event_attachment: true } });
  if (!event) return null;

  const [pilot, tool, mission, client] = await Promise.all([
    prisma.public_users.findUnique({ where: { user_id: event.fk_pilot_user_id }, select: { first_name: true, last_name: true } }),
    prisma.tool.findUnique({ where: { tool_id: event.fk_tool_id }, select: { tool_name: true, tool_code: true } }),
    event.fk_mission_id
      ? prisma.pilot_mission.findUnique({ where: { pilot_mission_id: event.fk_mission_id }, select: { mission_name: true, mission_code: true } })
      : null,
    event.fk_client_id
      ? prisma.client.findUnique({ where: { client_id: event.fk_client_id }, select: { client_name: true } })
      : null,
  ]);

  const attachments = await Promise.all(
    event.pilot_event_attachment.map(async (a) => ({
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size != null ? Number(a.file_size) : null,
      url: await getPresignedDownloadUrl(a.file_key, ATTACHMENT_URL_TTL_S, a.file_name),
      url_expires_in_seconds: ATTACHMENT_URL_TTL_S,
    })),
  );

  return {
    event,
    payload: {
      event_id: event.event_id,
      event_type: event.event_type,
      event_type_label: EVENT_TYPE_LABELS[event.event_type as EventType] ?? event.event_type,
      takeoff_time: event.takeoff_time.toISOString(),
      reported_at: event.created_at.toISOString(),
      location: {
        latitude: event.latitude != null ? Number(event.latitude) : null,
        longitude: event.longitude != null ? Number(event.longitude) : null,
        label: event.location_label,
      },
      notes: event.notes,
      pilot: { id: event.fk_pilot_user_id, name: [pilot?.first_name, pilot?.last_name].filter(Boolean).join(' ') || null },
      drone: { id: event.fk_tool_id, name: tool?.tool_name ?? null, code: tool?.tool_code ?? null },
      mission: event.fk_mission_id
        ? { id: event.fk_mission_id, name: mission?.mission_name?.trim() || null, code: mission?.mission_code?.trim() || null }
        : null,
      client: event.fk_client_id ? { id: event.fk_client_id, name: client?.client_name ?? null } : null,
      attachments,
    },
  };
}

/**
 * Sends `event.created` to every active webhook of the owner that targets the
 * event's client (or has no client filter) and subscribes to its event type.
 * Never throws: a failing client endpoint must not affect the pilot's report.
 */
export async function dispatchEventCreated(eventId: number): Promise<void> {
  try {
    const built = await buildEventPayload(eventId);
    if (!built) return;
    const { event, payload } = built;

    const configs = await prisma.event_webhook_config.findMany({
      where: {
        fk_owner_id: event.fk_owner_id,
        is_active: true,
        OR: [{ fk_client_id: null }, ...(event.fk_client_id ? [{ fk_client_id: event.fk_client_id }] : [])],
      },
    });
    const targets = configs.filter((c) => c.event_types.length === 0 || c.event_types.includes(event.event_type));

    await Promise.allSettled(targets.map((t) => deliver(t, 'event.created', payload, { eventId, isTest: false })));
  } catch (err) {
    console.error('[event-webhook] dispatch failed', err);
  }
}

export async function sendTestWebhook(ownerId: number, webhookId: number) {
  const config = await getOwnedWebhook(ownerId, webhookId);
  const result = await deliver(
    config,
    'event.test',
    { message: 'This is a test delivery from ReADI.', webhook_id: config.webhook_id, webhook_name: config.name },
    { eventId: null, isTest: true },
  );
  return result;
}
