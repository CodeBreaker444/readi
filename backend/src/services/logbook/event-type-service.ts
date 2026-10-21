import 'server-only';

import {
  EVENT_TYPE_CODE_MAX,
  EVENT_TYPE_NAME_MAX,
  prettifyEventTypeCode,
  slugifyEventTypeCode,
  type EventTypeItem,
} from '@/config/types/event-logbook';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EventLogbookError } from './event-logbook-service';

export const eventTypeInputSchema = z.object({
  type_name: z.string().trim().min(1).max(EVENT_TYPE_NAME_MAX),
  /** Client the type belongs to; null/omitted = default type available for every client. */
  client_id: z.number().int().positive().nullable().optional(),
});
export type EventTypeInput = z.infer<typeof eventTypeInputSchema>;

async function assertClientInOwner(ownerId: number, clientId: number | null | undefined) {
  if (!clientId) return;
  const client = await prisma.client.findFirst({ where: { client_id: clientId, fk_owner_id: ownerId }, select: { client_id: true } });
  if (!client) throw new EventLogbookError('Client not found', 404);
}

/**
 * The company's types: default ones (client_id null) and client-specific ones.
 * Pass `onlyClientId` for client-portal users so they only see default types and their own client's.
 */
export async function listEventTypes(ownerId: number, onlyClientId?: number): Promise<EventTypeItem[]> {
  const [types, counts] = await Promise.all([
    prisma.pilot_event_type.findMany({
      where: { fk_owner_id: ownerId, ...(onlyClientId ? { OR: [{ fk_client_id: null }, { fk_client_id: onlyClientId }] } : {}) },
      orderBy: [{ sort_order: 'asc' }, { type_name: 'asc' }],
      include: { client: { select: { client_name: true } } },
    }),
    prisma.pilot_event.groupBy({ by: ['event_type'], where: { fk_owner_id: ownerId }, _count: { _all: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.event_type, c._count._all]));
  return types.map((t) => ({
    event_type_id: t.event_type_id,
    type_code: t.type_code,
    type_name: t.type_name,
    client_id: t.fk_client_id,
    client_name: t.client?.client_name ?? null,
    event_count: countMap.get(t.type_code) ?? 0,
  }));
}

/** The company's clients, offered when assigning an event type to a client. */
export async function listTypeClients(ownerId: number): Promise<{ client_id: number; client_name: string }[]> {
  return prisma.client.findMany({ where: { fk_owner_id: ownerId }, orderBy: { client_name: 'asc' }, select: { client_id: true, client_name: true } });
}

/** code -> current name for the company, used to label events, emails and webhooks. */
export async function getEventTypeLabelMap(ownerId: number): Promise<Map<string, string>> {
  const rows = await prisma.pilot_event_type.findMany({
    where: { fk_owner_id: ownerId },
    select: { type_code: true, type_name: true },
  });
  return new Map(rows.map((r) => [r.type_code, r.type_name]));
}

export function eventTypeLabel(labels: Map<string, string>, code: string): string {
  return labels.get(code) ?? prettifyEventTypeCode(code);
}

/**
 * Throws unless every code is an event type of this company. With `clientId` (events), the type must also
 * be a default type or belong to that client.
 */
export async function assertEventTypesExist(
  ownerId: number,
  codes: string[],
  opts: { allowHistorical?: boolean; clientId?: number | null } = {},
): Promise<void> {
  const unique = [...new Set(codes)];
  if (unique.length === 0) return;
  const found = await prisma.pilot_event_type.findMany({
    where: {
      fk_owner_id: ownerId,
      type_code: { in: unique },
      ...(opts.clientId !== undefined ? { OR: [{ fk_client_id: null }, ...(opts.clientId ? [{ fk_client_id: opts.clientId }] : [])] } : {}),
    },
    select: { type_code: true },
  });
  let missing = unique.filter((c) => !found.some((f) => f.type_code === c));
  if (missing.length && opts.allowHistorical) {
    // Webhook filters may reference historical types that reported events still carry.
    const historical = await prisma.pilot_event.findMany({
      where: { fk_owner_id: ownerId, event_type: { in: missing } },
      distinct: ['event_type'],
      select: { event_type: true },
    });
    missing = missing.filter((c) => !historical.some((h) => h.event_type === c));
  }
  if (missing.length) throw new EventLogbookError('Unknown event type');
}

/** Names must be unique within a client and must not repeat a default type's name. */
async function assertNameFree(ownerId: number, name: string, clientId: number | null, exceptId?: number) {
  const slug = slugifyEventTypeCode(name);
  const rows = await prisma.pilot_event_type.findMany({
    where: {
      fk_owner_id: ownerId,
      OR: [{ fk_client_id: null }, ...(clientId ? [{ fk_client_id: clientId }] : [])],
      ...(exceptId ? { NOT: { event_type_id: exceptId } } : {}),
    },
    select: { type_name: true },
  });
  const clash = rows.some((r) => r.type_name.trim().toLowerCase() === name.trim().toLowerCase() || (slug && slugifyEventTypeCode(r.type_name) === slug));
  if (clash) throw new EventLogbookError('An event type with this name already exists', 409);
}

export async function createEventType(ownerId: number, userId: number, input: EventTypeInput): Promise<{ event_type_id: number; type_code: string }> {
  const clientId = input.client_id ?? null;
  await assertClientInOwner(ownerId, clientId);
  await assertNameFree(ownerId, input.type_name, clientId);

  // The code is generated once and never changes, so renaming keeps old events attached to the type.
  const base = slugifyEventTypeCode(input.type_name) || 'event_type';
  const taken = new Set(
    (await prisma.pilot_event_type.findMany({ where: { fk_owner_id: ownerId, type_code: { startsWith: base.slice(0, EVENT_TYPE_CODE_MAX - 4) } }, select: { type_code: true } })).map(
      (r) => r.type_code,
    ),
  );
  // Codes of deleted types can still be on old events; never reuse them for a different meaning.
  const used = new Set(
    (await prisma.pilot_event.findMany({ where: { fk_owner_id: ownerId, event_type: { startsWith: base.slice(0, EVENT_TYPE_CODE_MAX - 4) } }, distinct: ['event_type'], select: { event_type: true } })).map(
      (r) => r.event_type,
    ),
  );
  let code = base;
  for (let n = 2; taken.has(code) || used.has(code); n++) code = `${base.slice(0, EVENT_TYPE_CODE_MAX - String(n).length - 1)}_${n}`;

  const max = await prisma.pilot_event_type.aggregate({ where: { fk_owner_id: ownerId }, _max: { sort_order: true } });
  const row = await prisma.pilot_event_type.create({
    data: { fk_owner_id: ownerId, type_code: code, type_name: input.type_name, fk_client_id: clientId, sort_order: (max._max.sort_order ?? 0) + 10, created_by: userId },
    select: { event_type_id: true, type_code: true },
  });
  return row;
}

async function getOwnedType(ownerId: number, id: number) {
  const row = await prisma.pilot_event_type.findFirst({ where: { event_type_id: id, fk_owner_id: ownerId } });
  if (!row) throw new EventLogbookError('Event type not found', 404);
  return row;
}

export async function updateEventType(ownerId: number, id: number, input: EventTypeInput) {
  const row = await getOwnedType(ownerId, id);
  // Omitted client_id keeps the current scope; null moves the type to the defaults.
  const clientId = input.client_id === undefined ? row.fk_client_id : input.client_id;
  await assertClientInOwner(ownerId, clientId);
  await assertNameFree(ownerId, input.type_name, clientId, id);
  await prisma.pilot_event_type.update({
    where: { event_type_id: id },
    data: { type_name: input.type_name, fk_client_id: clientId, updated_at: new Date() },
  });
  return row;
}

/**
 * Deletes the type from the company's list. Reported events keep their code and show the
 * prettified code; webhooks that listed it simply stop matching it.
 */
export async function deleteEventType(ownerId: number, id: number) {
  const row = await getOwnedType(ownerId, id);
  // Default types serve every client, so the last one must stay.
  if (row.fk_client_id == null) {
    const otherDefaults = await prisma.pilot_event_type.count({ where: { fk_owner_id: ownerId, fk_client_id: null, NOT: { event_type_id: id } } });
    if (otherDefaults === 0) throw new EventLogbookError('At least one default event type is required', 409);
  }
  await prisma.pilot_event_type.delete({ where: { event_type_id: id } });
  return row;
}
