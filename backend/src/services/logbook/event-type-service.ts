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
});
export type EventTypeInput = z.infer<typeof eventTypeInputSchema>;

export async function listEventTypes(ownerId: number): Promise<EventTypeItem[]> {
  const [types, counts] = await Promise.all([
    prisma.pilot_event_type.findMany({
      where: { fk_owner_id: ownerId },
      orderBy: [{ sort_order: 'asc' }, { type_name: 'asc' }],
    }),
    prisma.pilot_event.groupBy({ by: ['event_type'], where: { fk_owner_id: ownerId }, _count: { _all: true } }),
  ]);
  const countMap = new Map(counts.map((c) => [c.event_type, c._count._all]));
  return types.map((t) => ({
    event_type_id: t.event_type_id,
    type_code: t.type_code,
    type_name: t.type_name,
    event_count: countMap.get(t.type_code) ?? 0,
  }));
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

/** Throws unless every code is an event type of this company. */
export async function assertEventTypesExist(ownerId: number, codes: string[]): Promise<void> {
  const unique = [...new Set(codes)];
  if (unique.length === 0) return;
  const found = await prisma.pilot_event_type.count({ where: { fk_owner_id: ownerId, type_code: { in: unique } } });
  if (found !== unique.length) throw new EventLogbookError('Unknown event type');
}

async function assertNameFree(ownerId: number, name: string, exceptId?: number) {
  const clash = await prisma.pilot_event_type.findFirst({
    where: { fk_owner_id: ownerId, type_name: { equals: name, mode: 'insensitive' }, ...(exceptId ? { NOT: { event_type_id: exceptId } } : {}) },
    select: { event_type_id: true },
  });
  if (clash) throw new EventLogbookError('An event type with this name already exists', 409);
}

export async function createEventType(ownerId: number, userId: number, input: EventTypeInput): Promise<{ event_type_id: number; type_code: string }> {
  await assertNameFree(ownerId, input.type_name);

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
    data: { fk_owner_id: ownerId, type_code: code, type_name: input.type_name, sort_order: (max._max.sort_order ?? 0) + 10, created_by: userId },
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
  await assertNameFree(ownerId, input.type_name, id);
  await prisma.pilot_event_type.update({ where: { event_type_id: id }, data: { type_name: input.type_name, updated_at: new Date() } });
  return row;
}

/**
 * Deletes the type from the company's list. Reported events keep their code and show the
 * prettified code; webhooks that listed it simply stop matching it.
 */
export async function deleteEventType(ownerId: number, id: number) {
  const row = await getOwnedType(ownerId, id);
  const remaining = await prisma.pilot_event_type.count({ where: { fk_owner_id: ownerId, NOT: { event_type_id: id } } });
  if (remaining === 0) throw new EventLogbookError('At least one event type is required', 409);
  await prisma.pilot_event_type.delete({ where: { event_type_id: id } });
  return row;
}
