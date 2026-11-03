import 'server-only';

import type { AiCompanyOption, AiDetection, AiEventActionType, AiEventItem, AiEventListResult, AiEventStatus, AiStreamMappingItem } from '@/config/types/ai-event';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { z } from 'zod';
import { sendEventReportedEmail } from '../../../../lib/resend/mail';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '../email/email-limit-service';
import { EventLogbookError } from './event-logbook-service';
import { AiEventActionInput } from '@/app/api/logbooks/event/ai/[id]/action/route';

// The model sends naive local timestamps ("2026-11-02 12:27:18"); they are IST (UTC+5:30) unless configured otherwise.
const SOURCE_UTC_OFFSET_MINUTES = Number(process.env.AI_EVENTS_TIMEZONE_OFFSET_MINUTES ?? 330);
const LINK_TTL_S = 7 * 24 * 60 * 60;
const LIST_URL_TTL_S = 15 * 60;
// Same page sizes as the Reported events table; 8 is the default.
export const AI_EVENT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 100;
const MAX_MAPPING_CONTACTS = 20;
const MAX_DETECTIONS = 200;

const emailRe = z.string().email();

// ── Payload ──────────────────────────────────────────────────────────────────

// The model uploads the images straight into our bucket under ai_alerts/ and only sends their keys.
const s3Key = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(/^ai_alerts\/[A-Za-z0-9._\-/]+$/, 'must start with "ai_alerts/" and contain only letters, digits and . _ - /')
  .refine((k) => !k.includes('..') && !k.includes('//'), 'must not contain ".." or "//"');

const text = (max: number) => z.string().trim().min(1).max(max);
const size = z.object({ width: z.number().int().positive(), height: z.number().int().positive() });
const box = z.array(z.number()).length(4);

const imageSchema = z.object({
  local_path: text(500),
  s3_key: s3Key,
  upload_status: text(50),
  resolution: size,
  // Always present; null when the upload went fine.
  error: z.string().max(1000).nullable(),
});

// Every field is mandatory: a payload with anything missing is rejected with a 400.
export const aiEventPayloadSchema = z.object({
  event_type: text(50),
  stream_id: text(200),
  session_id: text(100),
  track_id: z.number().int(),
  class_name: text(100),
  confidence: z.number().min(0).max(1),
  timestamp: text(40),
  frame_number: z.number().int().min(0),
  bounding_box: box,
  frames_detected: z.number().int().min(0),
  processing_time_ms: z.number().min(0),
  model_mode: text(50),
  s3_upload_status: text(50),
  snapshot: z.object({
    local_path: text(500),
    s3_key: s3Key,
    s3_upload_status: text(50),
  }),
  org_img: imageSchema,
  ai_processed_img: imageSchema,
  ai_processed_img_res: size,
  detections: z
    .array(
      z.object({
        track_id: z.number().int(),
        class_name: text(100),
        confidence: z.number().min(0).max(1),
        bounding_box: box,
      }),
    )
    .max(MAX_DETECTIONS),
});
export type AiEventPayload = z.infer<typeof aiEventPayloadSchema>;

/** Naive timestamps are read in the model's local timezone; ones carrying a zone are honoured as-is. */
export function parseAiTimestamp(raw: string): Date | null {
  if (/T/i.test(raw) && /(Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3})\d*)?$/.exec(raw);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = m.slice(1, 7).map(Number);
  const ms = m[7] ? Number(m[7].padEnd(3, '0')) : 0;
  const utc = new Date(Date.UTC(y, mo - 1, d, h, mi, s, ms));
  // Date.UTC rolls 2026-13-45 over silently; reject anything that did not round-trip.
  if (utc.getUTCFullYear() !== y || utc.getUTCMonth() !== mo - 1 || utc.getUTCDate() !== d || utc.getUTCHours() !== h) return null;
  return new Date(utc.getTime() - SOURCE_UTC_OFFSET_MINUTES * 60_000);
}

export function aiEventLabel(eventType: string): string {
  return eventType
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// ── Ingest ───────────────────────────────────────────────────────────────────

/**
 * Stores an event. Events belong to the platform, not to a company: a company sees one only
 * once an admin has added its stream id (see stream mappings below).
 */
export async function ingestAiEvent(p: AiEventPayload) {
  const eventTime = parseAiTimestamp(p.timestamp);
  if (!eventTime) throw new EventLogbookError('Invalid timestamp. Expected "YYYY-MM-DD HH:mm:ss" or an ISO-8601 value with a zone');

  // An image is only usable once the model says its upload finished.
  const done = (status: string) => status === 'uploaded';
  const snapshotKey = done(p.s3_upload_status) && done(p.snapshot.s3_upload_status) ? p.snapshot.s3_key : null;
  const aiKey = done(p.ai_processed_img.upload_status) ? p.ai_processed_img.s3_key : null;
  const orgKey = done(p.org_img.upload_status) ? p.org_img.s3_key : null;

  const key = {
    event_type: p.event_type.toUpperCase(),
    stream_id: p.stream_id,
    session_id: p.session_id,
    track_id: p.track_id,
    event_time: eventTime,
  };

  // What the stream pointed to at this moment is written onto the event. Looking it up again
  // when the list is shown would rewrite old events whenever the stream's client changes.
  const claim = await prisma.ai_stream_mapping.findUnique({
    where: { stream_id: p.stream_id },
    select: { fk_owner_id: true, fk_client_id: true, ai_stream_mapping_contact: { select: { fk_contact_id: true } } },
  });
  const client = claim?.fk_client_id
    ? await prisma.client.findFirst({ where: { client_id: claim.fk_client_id, fk_owner_id: claim.fk_owner_id }, select: { client_name: true } })
    : null;
  const alertsLinked = !!claim && (claim.fk_client_id != null || (claim.ai_stream_mapping_contact?.length ?? 0) > 0);

  let id: number;
  let duplicate = false;
  try {
    const row = await prisma.ai_event.create({
      data: {
        ...key,
        client_id: client ? claim!.fk_client_id : null,
        client_name: client?.client_name ?? null,
        alerts_linked: alertsLinked,
        class_name: p.class_name,
        confidence: p.confidence,
        frame_number: p.frame_number,
        bounding_box: p.bounding_box,
        frames_detected: p.frames_detected,
        processing_time_ms: p.processing_time_ms,
        model_mode: p.model_mode,
        snapshot_key: snapshotKey,
        ai_img_key: aiKey,
        ai_img_width: p.ai_processed_img.resolution.width,
        ai_img_height: p.ai_processed_img.resolution.height,
        org_img_key: orgKey,
        org_img_width: p.org_img.resolution.width,
        org_img_height: p.org_img.resolution.height,
        ai_res_width: p.ai_processed_img_res.width,
        ai_res_height: p.ai_processed_img_res.height,
        detections: p.detections,
        snapshot_status: snapshotKey || aiKey || orgKey ? 'stored' : 'failed',
      },
      select: { ai_event_id: true },
    });
    id = row.ai_event_id;
  } catch (err: any) {
    // Unique violation: the model retried an event we already hold.
    const existing = err?.code === 'P2002' ? await prisma.ai_event.findFirst({ where: key, select: { ai_event_id: true } }) : null;
    if (!existing) throw err;
    id = existing.ai_event_id;
    duplicate = true;
  }

  return { aiEventId: id, duplicate, claimed: !!claim };
}

// ── Post-ingest processing ───────────────────────────────────────────────────

async function setNotify(aiEventId: number, status: string, emails: string[] = []) {
  await prisma.ai_event.update({ where: { ai_event_id: aiEventId }, data: { notify_status: status, notified_emails: emails } });
}

/**
 * Sends the alert email for a claimed stream. Never throws: the model has already been
 * answered and the outcome is recorded on the event.
 */
export async function processAiEvent(aiEventId: number): Promise<void> {
  try {
    const event = await prisma.ai_event.findUnique({ where: { ai_event_id: aiEventId } });
    if (!event) return;
    // An event is handled once: whatever happened the first time (sent, failed, no recipients…) stands.
    if (event.notify_status !== 'pending') return;

    const mapping = await prisma.ai_stream_mapping.findUnique({
      where: { stream_id: event.stream_id },
      include: { ai_stream_mapping_contact: true },
    });
    // No company has added this stream id: the event is only stored.
    if (!mapping) return await setNotify(aiEventId, 'not_linked');
    if (!mapping.is_active) return await setNotify(aiEventId, 'inactive');
    const ownerId = mapping.fk_owner_id;

    const [client, contacts] = await Promise.all([
      mapping.fk_client_id
        ? prisma.client.findFirst({ where: { client_id: mapping.fk_client_id, fk_owner_id: ownerId }, select: { client_name: true, client_email: true } })
        : null,
      prisma.event_contact.findMany({
        where: { fk_owner_id: ownerId, contact_id: { in: mapping.ai_stream_mapping_contact.map((c) => c.fk_contact_id) } },
        select: { email: true },
      }),
    ]);

    const recipients = [
      ...new Set(
        [mapping.notify_client ? client?.client_email : null, ...contacts.map((c) => c.email)]
          .map((e) => e?.trim().toLowerCase())
          .filter((e): e is string => !!e && emailRe.safeParse(e).success),
      ),
    ];
    if (recipients.length === 0) return await setNotify(aiEventId, 'no_recipients');

    if (await isDailyEmailLimitReached(ownerId)) return await setNotify(aiEventId, 'limit_reached');

    const label = aiEventLabel(event.event_type);
    const rows = [
      { label: 'Event', value: label },
      { label: 'Stream', value: event.stream_id },
      ...(client ? [{ label: 'Client', value: client.client_name }] : []),
      ...(event.class_name ? [{ label: 'Detected', value: event.class_name }] : []),
      ...(event.confidence != null ? [{ label: 'Confidence', value: `${Math.round(event.confidence * 100)}%` }] : []),
      { label: 'Time', value: `${event.event_time.toISOString().slice(0, 16).replace('T', ' ')} UTC` },
    ];

    const imageKeys = [
      { key: event.ai_img_key ?? event.snapshot_key, name: 'ai-processed' },
      { key: event.org_img_key, name: 'original' },
    ].filter((i): i is { key: string; name: string } => !!i.key);
    const attachments = await Promise.all(
      imageKeys.map(async (i) => ({
        name: i.name,
        isImage: true,
        previewUrl: await getPresignedDownloadUrl(i.key, LINK_TTL_S, i.name, 'inline'),
        downloadUrl: await getPresignedDownloadUrl(i.key, LINK_TTL_S, i.name, 'attachment'),
      })),
    );

    const sent = await sendEventReportedEmail(recipients, `AI alert: ${label} (${event.stream_id})`, {
      eventLabel: `AI alert — ${label}`,
      rows,
      notes: null,
      mapImageUrl: null,
      mapLinkUrl: null,
      attachments,
      viewUrl: `${process.env.APP_URL ?? ''}/logbooks/event-logbook?tab=ai`,
    });
    if (!sent) return await setNotify(aiEventId, 'failed');
    await incrementDailyEmailCount(ownerId);
    await setNotify(aiEventId, 'sent', recipients);
  } catch (err) {
    console.error(`[ai-event] #${aiEventId} processing failed`, err);
    await setNotify(aiEventId, 'failed').catch(() => {});
  }
}


export const aiEventFiltersSchema = z.object({
  page: z.number().int().min(1).max(100000).optional(),
  page_size: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  stream_id: z.string().trim().max(200).optional(),
  event_type: z.string().trim().max(50).optional(),
  status: z.enum(['open', 'acknowledged', 'resolved']).optional(),
  date_start: z.string().datetime().optional(),
  date_end: z.string().datetime().optional(),
  company: z.union([z.literal('all'), z.literal('unclaimed'), z.number().int().positive()]).optional(),
});
export type AiEventFilters = z.infer<typeof aiEventFiltersSchema>;

export interface AiEventScope {
  ownerId: number;
  isSuperAdmin: boolean;
}

function parseDetections(raw: unknown): AiDetection[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (d): d is AiDetection => !!d && typeof d.track_id === 'number' && typeof d.class_name === 'string' && typeof d.confidence === 'number' && Array.isArray(d.bounding_box),
  );
}

const toStatus = (s: string): AiEventStatus => (s === 'acknowledged' || s === 'resolved' ? s : 'open');

const presign = (key: string | null) =>
  key ? getPresignedDownloadUrl(key, LIST_URL_TTL_S, 'snapshot', 'inline').catch(() => null) : Promise.resolve(null);

/**
 * Company users see the events of the stream ids their company added. Super admins see every
 * event of the platform, and which company (if any) added its stream id.
 */
export async function listAiEvents(scope: AiEventScope, f: AiEventFilters): Promise<AiEventListResult> {
  const mappings = await prisma.ai_stream_mapping.findMany({
    where: scope.isSuperAdmin ? {} : { fk_owner_id: scope.ownerId },
    select: { stream_id: true, fk_owner_id: true, fk_client_id: true },
  });

  const ownerIds = [...new Set(mappings.map((m) => m.fk_owner_id))];
  const owners =
    scope.isSuperAdmin && ownerIds.length
      ? await prisma.owner.findMany({ where: { owner_id: { in: ownerIds } }, select: { owner_id: true, owner_name: true }, orderBy: { owner_name: 'asc' } })
      : [];
  const ownerName = new Map(owners.map((o) => [o.owner_id, o.owner_name]));
  const byStream = new Map(mappings.map((m) => [m.stream_id, m]));

  // Which stream ids may be shown.
  const and: object[] = [];
  const allClaimed = mappings.map((m) => m.stream_id);
  if (!scope.isSuperAdmin) {
    and.push({ stream_id: { in: allClaimed } });
  } else if (f.company === 'unclaimed') {
    and.push({ stream_id: { notIn: allClaimed } });
  } else if (typeof f.company === 'number') {
    and.push({ stream_id: { in: mappings.filter((m) => m.fk_owner_id === f.company).map((m) => m.stream_id) } });
  }
  if (f.stream_id) and.push({ stream_id: { contains: f.stream_id, mode: 'insensitive' } });
  if (f.status) and.push({ status: f.status });
  if (f.event_type) and.push({ event_type: { contains: f.event_type.trim().replace(/\s+/g, '_'), mode: 'insensitive' } });
  if (f.date_start || f.date_end) {
    and.push({ event_time: { ...(f.date_start ? { gte: new Date(f.date_start) } : {}), ...(f.date_end ? { lte: new Date(f.date_end) } : {}) } });
  }
  const where = { AND: and };

  const page = f.page ?? 1;
  const pageSize = f.page_size ?? AI_EVENT_PAGE_SIZE;
  const [total, rows] = await Promise.all([
    prisma.ai_event.count({ where }),
    prisma.ai_event.findMany({
      where,
      // Latest added first: ids grow with every stored event. The event's own time can be earlier than
      // an event that arrived before it, so it is not used for the order.
      orderBy: { ai_event_id: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { ai_event_action: { orderBy: { action_id: 'asc' } } },
    }),
  ]);

  const data: AiEventItem[] = await Promise.all(
    rows.map(async (r) => {
      const claim = byStream.get(r.stream_id);
      return {
        ai_event_id: r.ai_event_id,
        event_type: r.event_type,
        event_label: aiEventLabel(r.event_type),
        stream_id: r.stream_id,
        session_id: r.session_id,
        track_id: r.track_id === -1 ? null : r.track_id,
        class_name: r.class_name,
        confidence: r.confidence,
        event_time: r.event_time.toISOString(),
        frame_number: r.frame_number,
        bounding_box: r.bounding_box,
        frames_detected: r.frames_detected,
        processing_time_ms: r.processing_time_ms,
        model_mode: r.model_mode,
        snapshot_status: r.snapshot_status,
        snapshot_url: await presign(r.ai_img_key ?? r.snapshot_key),
        original_url: await presign(r.org_img_key),
        original_size: r.org_img_width && r.org_img_height ? { width: r.org_img_width, height: r.org_img_height } : null,
        detections: parseDetections(r.detections),
        notify_status: r.notify_status,
        notified_emails: r.notified_emails,
        client_name: r.client_name,
        linked: r.alerts_linked,
        status: toStatus(r.status),
        actions: r.ai_event_action.map((x) => ({
          action_id: x.action_id,
          action: x.action as AiEventActionType,
          comment: x.comment,
          user_email: x.user_email,
          created_at: x.created_at.toISOString(),
        })),
        company_name: scope.isSuperAdmin && claim ? (ownerName.get(claim.fk_owner_id) ?? null) : null,
        claimed: !!claim,
      };
    }),
  );

  const companies: AiCompanyOption[] = scope.isSuperAdmin ? owners.map((o) => ({ owner_id: o.owner_id, name: o.owner_name })) : [];
  return { data, total, page, page_size: pageSize, scope: scope.isSuperAdmin ? 'all' : 'company', companies };
}

// Flytsense acknowledge handling 

/** acknowledged only from open; resolved from open or acknowledged and then final. */
const ALLOWED_FROM: Record<AiEventActionType, AiEventStatus[]> = {
  acknowledged: ['open'],
  resolved: ['open', 'acknowledged'],
};

export async function actOnAiEvent(scope: AiEventScope, user: { userId: number; email: string }, aiEventId: number, input: AiEventActionInput) {
  const event = await prisma.ai_event.findUnique({ where: { ai_event_id: aiEventId }, select: { stream_id: true } });
  // Same visibility as the list: a company only reaches events of the stream ids it added.
  const visible =
    !!event && (scope.isSuperAdmin || !!(await prisma.ai_stream_mapping.findFirst({ where: { stream_id: event.stream_id, fk_owner_id: scope.ownerId }, select: { mapping_id: true } })));
  if (!visible) throw new EventLogbookError('Event not found', 404);

  const allowed = ALLOWED_FROM[input.action];
  await prisma.$transaction(async (tx) => {
    // Conditional on the current status so two people acting at once cannot both succeed.
    const moved = await tx.ai_event.updateMany({ where: { ai_event_id: aiEventId, status: { in: allowed } }, data: { status: input.action } });
    if (moved.count === 0) throw new EventLogbookError(`This event can no longer be ${input.action}`, 409);
    await tx.ai_event_action.create({
      data: { fk_ai_event_id: aiEventId, action: input.action, comment: input.comment, user_id: user.userId, user_email: user.email },
    });
  });
}

export const streamMappingInputSchema = z.object({
  stream_id: z.string().trim().min(1).max(200),
  client_id: z.number().int().positive().nullable().optional(),
  contact_ids: z.array(z.number().int().positive()).max(MAX_MAPPING_CONTACTS).default([]),
  notify_client: z.boolean().optional(),
  is_active: z.boolean().optional(),
});
export type StreamMappingInput = z.infer<typeof streamMappingInputSchema>;

/** No default on contact_ids: an omitted list must mean "leave the contacts alone", not "clear them". */
export const streamMappingUpdateSchema = z
  .object({
    stream_id: z.string().trim().min(1).max(200),
    client_id: z.number().int().positive().nullable(),
    contact_ids: z.array(z.number().int().positive()).max(MAX_MAPPING_CONTACTS),
    notify_client: z.boolean(),
    is_active: z.boolean(),
  })
  .partial();

export async function listStreamMappings(ownerId: number): Promise<AiStreamMappingItem[]> {
  const rows = await prisma.ai_stream_mapping.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { mapping_id: 'desc' },
    include: { ai_stream_mapping_contact: true },
  });
  const clientIds = [...new Set(rows.map((r) => r.fk_client_id).filter((v): v is number => v != null))];
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } })
    : [];
  const names = new Map(clients.map((c) => [c.client_id, c.client_name]));
  return rows.map((r) => ({
    mapping_id: r.mapping_id,
    stream_id: r.stream_id,
    fk_client_id: r.fk_client_id,
    client_name: r.fk_client_id ? (names.get(r.fk_client_id) ?? null) : null,
    contact_ids: r.ai_stream_mapping_contact.map((c) => c.fk_contact_id),
    notify_client: r.notify_client,
    is_active: r.is_active,
  }));
}

/** client_id -> email, so the mapping form can show which address "email the client" means. */
export async function getClientEmailMap(ownerId: number): Promise<Record<number, string | null>> {
  const rows = await prisma.client.findMany({ where: { fk_owner_id: ownerId }, select: { client_id: true, client_email: true } });
  return Object.fromEntries(rows.map((c) => [c.client_id, c.client_email?.trim() || null]));
}

async function assertMappingRefs(ownerId: number, clientId: number | null | undefined, contactIds: number[]) {
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { client_id: clientId, fk_owner_id: ownerId }, select: { client_id: true } });
    if (!client) throw new EventLogbookError('Client not found', 404);
  }
  if (contactIds.length) {
    const found = await prisma.event_contact.count({ where: { fk_owner_id: ownerId, contact_id: { in: contactIds } } });
    if (found !== contactIds.length) throw new EventLogbookError('Contact not found', 404);
  }
}

// Stream ids are unique across the platform; the message does not reveal who holds it.
const STREAM_TAKEN = 'This stream id is already in use';

async function assertStreamFree(streamId: string, exceptId?: number) {
  const clash = await prisma.ai_stream_mapping.findFirst({
    where: { stream_id: streamId, ...(exceptId ? { NOT: { mapping_id: exceptId } } : {}) },
    select: { mapping_id: true },
  });
  if (clash) throw new EventLogbookError(STREAM_TAKEN, 409);
}

export async function createStreamMapping(ownerId: number, userId: number, input: StreamMappingInput) {
  const contactIds = [...new Set(input.contact_ids)];
  await assertMappingRefs(ownerId, input.client_id, contactIds);
  await assertStreamFree(input.stream_id);
  try {
    const row = await prisma.ai_stream_mapping.create({
      data: {
        fk_owner_id: ownerId,
        stream_id: input.stream_id,
        fk_client_id: input.client_id ?? null,
        notify_client: input.notify_client ?? true,
        is_active: input.is_active ?? true,
        created_by: userId,
        ai_stream_mapping_contact: { create: contactIds.map((id) => ({ fk_contact_id: id })) },
      },
      select: { mapping_id: true },
    });
    return row.mapping_id;
  } catch (err: any) {
    // Two companies adding the same stream id at the same moment.
    if (err?.code === 'P2002') throw new EventLogbookError(STREAM_TAKEN, 409);
    throw err;
  }
}

async function getOwnedMapping(ownerId: number, mappingId: number) {
  const row = await prisma.ai_stream_mapping.findFirst({ where: { mapping_id: mappingId, fk_owner_id: ownerId } });
  if (!row) throw new EventLogbookError('Stream mapping not found', 404);
  return row;
}

export async function updateStreamMapping(ownerId: number, mappingId: number, input: Partial<StreamMappingInput>) {
  const existing = await getOwnedMapping(ownerId, mappingId);
  const contactIds = input.contact_ids ? [...new Set(input.contact_ids)] : undefined;
  if (input.client_id || contactIds) await assertMappingRefs(ownerId, input.client_id, contactIds ?? []);
  if (input.stream_id && input.stream_id !== existing.stream_id) await assertStreamFree(input.stream_id, mappingId);

  await prisma.$transaction([
    ...(contactIds ? [prisma.ai_stream_mapping_contact.deleteMany({ where: { fk_mapping_id: mappingId } })] : []),
    prisma.ai_stream_mapping.update({
      where: { mapping_id: mappingId },
      data: {
        ...(input.stream_id !== undefined ? { stream_id: input.stream_id } : {}),
        ...(input.client_id !== undefined ? { fk_client_id: input.client_id } : {}),
        ...(input.notify_client !== undefined ? { notify_client: input.notify_client } : {}),
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
        ...(contactIds ? { ai_stream_mapping_contact: { create: contactIds.map((id) => ({ fk_contact_id: id })) } } : {}),
        updated_at: new Date(),
      },
    }),
  ]);
}

export async function deleteStreamMapping(ownerId: number, mappingId: number) {
  await getOwnedMapping(ownerId, mappingId);
  await prisma.ai_stream_mapping.delete({ where: { mapping_id: mappingId } });
}
