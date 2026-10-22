/**
 * Event type management: listing, name/code rules, rename (webhook filter sync) and delete.
 * Prisma is mocked.
 *
 * Run:  npm test -- event-types
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: jest.fn(), findMany: jest.fn() },
    pilot_event: { findMany: jest.fn(), groupBy: jest.fn() },
    pilot_event_type: {
      findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
      delete: jest.fn(), count: jest.fn(), aggregate: jest.fn(),
    },
    event_webhook_config: { findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/s3Client', () => ({ deleteFileFromS3: jest.fn(), getPresignedDownloadUrl: jest.fn(), getPresignedUploadUrl: jest.fn() }));
jest.mock('@/lib/auth/feature-permissions', () => ({ getSessionEffectivePermissions: jest.fn() }));

import { EVENT_TYPE_CODE_MAX } from '@/config/types/event-logbook';
import {
  assertEventTypesExist,
  createEventType,
  deleteEventType,
  eventTypeFallbackLabel,
  eventTypeInputSchema,
  listEventTypes,
  listTypeClients,
  resolveEventType,
  updateEventType,
} from '@/backend/services/logbook/event-type-service';
import { prisma } from '@/lib/prisma';

const db = prisma as any;

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  // Sensible "nothing exists yet" defaults; tests override what they care about.
  db.pilot_event_type.findMany.mockResolvedValue([]);
  db.pilot_event.findMany.mockResolvedValue([]);
  db.event_webhook_config.findMany.mockResolvedValue([]);
  db.pilot_event_type.aggregate.mockResolvedValue({ _max: { sort_order: null } });
  db.pilot_event_type.create.mockImplementation(async ({ data }: any) => ({ event_type_id: 77, type_code: data.type_code }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('eventTypeInputSchema', () => {
  it('trims the name and allows an optional/null client', () => {
    expect(eventTypeInputSchema.parse({ type_name: '  Bird  ' })).toEqual({ type_name: 'Bird' });
    expect(eventTypeInputSchema.parse({ type_name: 'x', client_id: null }).client_id).toBeNull();
  });
  it.each([
    ['empty name', { type_name: '   ' }],
    ['name over 100 chars', { type_name: 'x'.repeat(101) }],
    ['non-positive client id', { type_name: 'x', client_id: 0 }],
  ])('rejects %s', (_n, input) => {
    expect(eventTypeInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('eventTypeFallbackLabel', () => {
  it('prettifies a code', () => {
    expect(eventTypeFallbackLabel('lost_link')).toBe('Lost link');
  });
});

describe('listEventTypes', () => {
  const types = [
    { event_type_id: 1, type_code: 'bird', type_name: 'Bird', fk_client_id: null, client: null },
    { event_type_id: 2, type_code: 'rf', type_name: 'RF', fk_client_id: 5, client: { client_name: 'Acme' } },
  ];

  it('adds event counts and client names', async () => {
    db.pilot_event_type.findMany.mockResolvedValue(types);
    db.pilot_event.groupBy.mockResolvedValue([{ fk_event_type_id: 2, _count: { _all: 4 } }]);
    expect(await listEventTypes(1)).toEqual([
      { event_type_id: 1, type_code: 'bird', type_name: 'Bird', client_id: null, client_name: null, event_count: 0 },
      { event_type_id: 2, type_code: 'rf', type_name: 'RF', client_id: 5, client_name: 'Acme', event_count: 4 },
    ]);
  });

  it('restricts to default and own-client types for the client portal', async () => {
    db.pilot_event.groupBy.mockResolvedValue([]);
    await listEventTypes(1, 5);
    expect(db.pilot_event_type.findMany.mock.calls[0][0].where).toEqual({
      fk_owner_id: 1, OR: [{ fk_client_id: null }, { fk_client_id: 5 }],
    });
    await listEventTypes(1);
    expect(db.pilot_event_type.findMany.mock.calls[1][0].where).toEqual({ fk_owner_id: 1 });
  });
});

describe('listTypeClients', () => {
  it('only lists clients of the company', async () => {
    db.client.findMany.mockResolvedValue([]);
    await listTypeClients(1);
    expect(db.client.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1 });
  });
});

describe('resolveEventType', () => {
  it('returns the matching type', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 3, type_code: 'bird', type_name: 'Bird' });
    await expect(resolveEventType(1, 3, 5)).resolves.toEqual({ event_type_id: 3, type_code: 'bird', type_name: 'Bird' });
    expect(db.pilot_event_type.findFirst.mock.calls[0][0].where.OR).toEqual([{ fk_client_id: null }, { fk_client_id: 5 }]);
  });
  it('without a client only defaults qualify', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 3, type_code: 'bird', type_name: 'Bird' });
    await resolveEventType(1, 3, null);
    expect(db.pilot_event_type.findFirst.mock.calls[0][0].where.OR).toEqual([{ fk_client_id: null }]);
  });
  it('throws for an unknown type', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue(null);
    await expect(resolveEventType(1, 3, 5)).rejects.toThrow('Unknown event type');
  });
});

describe('assertEventTypesExist', () => {
  it('passes for an empty list without querying', async () => {
    await assertEventTypesExist(1, []);
    expect(db.pilot_event_type.findMany).not.toHaveBeenCalled();
  });
  it('de-duplicates and passes when all codes exist', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([{ type_code: 'bird' }]);
    await assertEventTypesExist(1, ['bird', 'bird']);
    expect(db.pilot_event_type.findMany.mock.calls[0][0].where.type_code).toEqual({ in: ['bird'] });
  });
  it('throws for a missing code', async () => {
    await expect(assertEventTypesExist(1, ['ghost'])).rejects.toThrow('Unknown event type');
  });
  it('accepts a historical code that reported events still carry', async () => {
    db.pilot_event.findMany.mockResolvedValue([{ event_type: 'old' }]);
    await expect(assertEventTypesExist(1, ['old'], { allowHistorical: true })).resolves.toBeUndefined();
    await expect(assertEventTypesExist(1, ['old', 'ghost'], { allowHistorical: true })).rejects.toThrow('Unknown event type');
  });
});

describe('createEventType', () => {
  it('creates a default type with a slug code and the next sort order', async () => {
    db.pilot_event_type.aggregate.mockResolvedValue({ _max: { sort_order: 30 } });
    const r = await createEventType(1, 2, { type_name: 'Bird strike!' });
    expect(r).toEqual({ event_type_id: 77, type_code: 'bird_strike' });
    expect(db.pilot_event_type.create.mock.calls[0][0].data).toMatchObject({
      fk_owner_id: 1, type_code: 'bird_strike', type_name: 'Bird strike!', fk_client_id: null, sort_order: 40, created_by: 2,
    });
  });

  it('404s for a client of another company', async () => {
    db.client.findFirst.mockResolvedValue(null);
    await expect(createEventType(1, 2, { type_name: 'X', client_id: 9 })).rejects.toMatchObject({ status: 404 });
    expect(db.pilot_event_type.create).not.toHaveBeenCalled();
  });

  it('409s on a duplicate name, ignoring case and punctuation', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([{ type_name: 'Bird Strike' }]);
    await expect(createEventType(1, 2, { type_name: 'bird strike' })).rejects.toMatchObject({ status: 409 });
    await expect(createEventType(1, 2, { type_name: 'Bird-strike!' })).rejects.toMatchObject({ status: 409 });
    expect(db.pilot_event_type.create).not.toHaveBeenCalled();
  });

  it('checks names against defaults plus the target client only', async () => {
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    await createEventType(1, 2, { type_name: 'RF', client_id: 5 });
    expect(db.pilot_event_type.findMany.mock.calls[0][0].where.OR).toEqual([{ fk_client_id: null }, { fk_client_id: 5 }]);
  });

  it('suffixes the code when taken by another type or by an existing event', async () => {
    db.pilot_event_type.findMany
      .mockResolvedValueOnce([]) // assertNameFree
      .mockResolvedValueOnce([{ type_code: 'bird' }]); // taken codes
    db.pilot_event.findMany.mockResolvedValue([{ event_type: 'bird_2' }]); // codes still on events
    const r = await createEventType(1, 2, { type_name: 'Bird' });
    expect(r.type_code).toBe('bird_3');
  });

  it('falls back to a generic code when the name has no usable characters', async () => {
    const r = await createEventType(1, 2, { type_name: '!!!' });
    expect(r.type_code).toBe('event_type');
  });

  it('keeps generated codes within the length limit', async () => {
    const name = 'a'.repeat(100);
    db.pilot_event_type.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ type_code: 'a'.repeat(EVENT_TYPE_CODE_MAX) }]);
    const r = await createEventType(1, 2, { type_name: name });
    expect(r.type_code.length).toBeLessThanOrEqual(EVENT_TYPE_CODE_MAX);
    expect(r.type_code.endsWith('_2')).toBe(true);
  });
});

describe('updateEventType', () => {
  const row = { event_type_id: 3, type_code: 'bird', type_name: 'Bird', fk_client_id: null };
  beforeEach(() => {
    db.pilot_event_type.findFirst.mockResolvedValue(row);
  });

  it('404s for a type of another company', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue(null);
    await expect(updateEventType(1, 3, { type_name: 'X' })).rejects.toMatchObject({ status: 404 });
  });

  it('keeps the code and skips webhook updates when the name is unchanged', async () => {
    const r = await updateEventType(1, 3, { type_name: ' Bird ' });
    expect(r).toMatchObject({ type_code: 'bird', webhooks_updated: 0 });
    expect(db.event_webhook_config.findMany).not.toHaveBeenCalled();
    expect(db.pilot_event_type.update.mock.calls[0][0].data).toMatchObject({ type_code: 'bird' });
  });

  it('excludes the type itself from the duplicate-name check', async () => {
    await updateEventType(1, 3, { type_name: 'Bird' });
    expect(db.pilot_event_type.findMany.mock.calls[0][0].where.NOT).toEqual({ event_type_id: 3 });
  });

  it('keeps the current client scope when client_id is omitted, and moves to defaults on null', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue({ ...row, fk_client_id: 5 });
    db.client.findFirst.mockResolvedValue({ client_id: 5 });
    await updateEventType(1, 3, { type_name: 'Bird' });
    expect(db.pilot_event_type.update.mock.calls[0][0].data.fk_client_id).toBe(5);
    await updateEventType(1, 3, { type_name: 'Bird', client_id: null });
    expect(db.pilot_event_type.update.mock.calls[1][0].data.fk_client_id).toBeNull();
  });

  it('regenerates the code on rename and rewrites webhook filters', async () => {
    db.event_webhook_config.findMany.mockResolvedValue([
      { webhook_id: 1, event_types: ['bird', 'rf'] },
      { webhook_id: 2, event_types: ['bird', 'bird_strike'] }, // already has the new code: no duplicates
    ]);
    const r = await updateEventType(1, 3, { type_name: 'Bird strike' });
    expect(r).toMatchObject({ type_code: 'bird_strike', webhooks_updated: 2 });
    expect(db.event_webhook_config.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1, event_types: { has: 'bird' } });
    expect(db.event_webhook_config.update.mock.calls.map((c: any) => c[0].data.event_types)).toEqual([
      ['bird_strike', 'rf'],
      ['bird_strike'],
    ]);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('409s when renaming onto another type name', async () => {
    db.pilot_event_type.findMany.mockResolvedValue([{ type_name: 'Lost link' }]);
    await expect(updateEventType(1, 3, { type_name: 'lost link' })).rejects.toMatchObject({ status: 409 });
    expect(db.pilot_event_type.update).not.toHaveBeenCalled();
  });
});

describe('deleteEventType', () => {
  it('404s for an unknown type', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue(null);
    await expect(deleteEventType(1, 3)).rejects.toMatchObject({ status: 404 });
  });

  it('refuses to delete the last default type (409)', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 3, fk_client_id: null });
    db.pilot_event_type.count.mockResolvedValue(0);
    await expect(deleteEventType(1, 3)).rejects.toMatchObject({ status: 409 });
    expect(db.pilot_event_type.delete).not.toHaveBeenCalled();
  });

  it('deletes a default type when another default remains', async () => {
    const row = { event_type_id: 3, fk_client_id: null };
    db.pilot_event_type.findFirst.mockResolvedValue(row);
    db.pilot_event_type.count.mockResolvedValue(1);
    await expect(deleteEventType(1, 3)).resolves.toBe(row);
    expect(db.pilot_event_type.delete).toHaveBeenCalledWith({ where: { event_type_id: 3 } });
  });

  it('client-specific types are deleted without the default check', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 3, fk_client_id: 5 });
    await deleteEventType(1, 3);
    expect(db.pilot_event_type.count).not.toHaveBeenCalled();
    expect(db.pilot_event_type.delete).toHaveBeenCalled();
  });
});
