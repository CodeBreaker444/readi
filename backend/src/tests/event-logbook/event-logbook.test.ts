/**
 * Unit tests for the event logbook module: shared helpers (event-logbook types),
 * validation schemas and the service rules (scoping, attachment checks, client
 * resolution). Prisma, S3 and permissions are mocked.
 *
 * Run:  npm test -- event-logbook
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pilot_mission: { findMany: jest.fn(), findUnique: jest.fn() },
    tool: { findMany: jest.fn(), findUnique: jest.fn() },
    tool_component: { findMany: jest.fn() },
    client: { findMany: jest.fn() },
    event_contact: { findMany: jest.fn() },
    pilot_event_type: { findFirst: jest.fn(), findMany: jest.fn() },
    pilot_event: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
    pilot_event_attachment: { deleteMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}));
jest.mock('@/lib/s3Client', () => ({
  deleteFileFromS3: jest.fn().mockResolvedValue(undefined),
  getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3/x'),
  getPresignedUploadUrl: jest.fn().mockResolvedValue('https://s3/upload'),
}));
jest.mock('@/lib/auth/feature-permissions', () => ({
  getSessionEffectivePermissions: jest.fn(),
}));

import {
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_SUPPORT_MEDIA_MAX_FILES,
  EVENT_TYPE_CODE_MAX,
  droneComponentLine,
  formatMissionLabel,
  prettifyEventTypeCode,
  slugifyEventTypeCode,
} from '@/config/types/event-logbook';
import {
  EventLogbookError,
  MAX_NOTIFY_RECIPIENTS,
  addSupportMedia,
  addSupportMediaSchema,
  createAttachmentUploadUrl,
  createEvent,
  createEventSchema,
  deleteEvent,
  isScopedUser,
  mapSnapshotKey,
  updateEvent,
  updateEventSchema,
} from '@/backend/services/logbook/event-logbook-service';
import { prisma } from '@/lib/prisma';
import { deleteFileFromS3, getPresignedUploadUrl } from '@/lib/s3Client';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';

const db = prisma as any;
const mockPerms = getSessionEffectivePermissions as jest.Mock;

const pilot = { userId: 7, ownerId: 1, role: 'PILOT' } as any;
const admin = { userId: 2, ownerId: 1, role: 'ADMIN' } as any;
const prefix = 'event-logbook/1/7/';
const adminPrefix = 'event-logbook/1/2/';

const baseInput = {
  tool_id: 10,
  event_type_id: 3,
  takeoff_time: '2026-10-20T10:00:00Z',
  latitude: 45.1,
  longitude: 9.2,
};

beforeEach(() => {
  // resetAllMocks also drops implementations and queued *Once values, so no test leaks into the next.
  jest.resetAllMocks();
  mockPerms.mockResolvedValue({ systems_manage: null });
  (deleteFileFromS3 as jest.Mock).mockResolvedValue(undefined);
  (getPresignedUploadUrl as jest.Mock).mockResolvedValue('https://s3/upload');
  db.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── shared helpers ───────────────────────────────────────────────────────────

describe('slugifyEventTypeCode', () => {
  it('lowercases, strips punctuation and accents', () => {
    expect(slugifyEventTypeCode('Bird strike!')).toBe('bird_strike');
    expect(slugifyEventTypeCode('  Perdita Connessione è  ')).toBe('perdita_connessione_e');
  });
  it('trims leading/trailing separators and caps the length', () => {
    expect(slugifyEventTypeCode('--abc--')).toBe('abc');
    expect(slugifyEventTypeCode('a'.repeat(200))).toHaveLength(EVENT_TYPE_CODE_MAX);
  });
});

describe('prettifyEventTypeCode', () => {
  it('turns a code into a label', () => {
    expect(prettifyEventTypeCode('bird_strike')).toBe('Bird strike');
    expect(prettifyEventTypeCode('lost__link')).toBe('Lost link');
  });
  it('returns the input when nothing is left', () => {
    expect(prettifyEventTypeCode('___')).toBe('___');
  });
});

describe('formatMissionLabel', () => {
  it('code · name when both differ', () => {
    expect(formatMissionLabel({ mission_code: 'M-1', mission_name: 'Roof' })).toBe('M-1 · Roof');
  });
  it('single value when equal or only one present', () => {
    expect(formatMissionLabel({ mission_code: 'M-1', mission_name: 'M-1' })).toBe('M-1');
    expect(formatMissionLabel({ mission_name: ' Roof ' })).toBe('Roof');
  });
  it('falls back to #id, then a dash', () => {
    expect(formatMissionLabel({}, 42)).toBe('#42');
    expect(formatMissionLabel({})).toBe('—');
  });
});

describe('droneComponentLine', () => {
  it('uses the first component, preferring the code', () => {
    expect(droneComponentLine({ drone_components: [{ component_name: 'Body', component_code: 'C1', serial_number: 'S1' }] })).toBe('C1 – S1');
    expect(droneComponentLine({ drone_components: [{ component_name: 'Body', component_code: null, serial_number: 'S1' }] })).toBe('Body – S1');
  });
  it('is null without components', () => {
    expect(droneComponentLine({ drone_components: [] })).toBeNull();
    expect(droneComponentLine({})).toBeNull();
  });
});

// ─── schemas ──────────────────────────────────────────────────────────────────

describe('createEventSchema', () => {
  it('accepts a minimal event and applies defaults', () => {
    const r = createEventSchema.parse(baseInput);
    expect(r.notify_contact_ids).toEqual([]);
    expect(r.attachments).toEqual([]);
    expect(r.support_media).toEqual([]);
  });
  it.each([
    ['latitude > 90', { latitude: 91 }],
    ['longitude < -180', { longitude: -181 }],
    ['bad takeoff time', { takeoff_time: 'not-a-date' }],
    ['notes over 500 chars', { notes: 'x'.repeat(501) }],
    ['non-positive tool id', { tool_id: 0 }],
    ['too many recipients', { notify_contact_ids: Array.from({ length: MAX_NOTIFY_RECIPIENTS + 1 }, (_, i) => i + 1) }],
    ['too many attachments', {
      attachments: Array.from({ length: EVENT_ATTACHMENT_MAX_FILES + 1 }, () => ({ file_name: 'a', file_key: 'k', file_type: 'image/png', file_size: 1 })),
    }],
    ['oversized attachment', { attachments: [{ file_name: 'a', file_key: 'k', file_type: 'image/png', file_size: EVENT_ATTACHMENT_MAX_BYTES + 1 }] }],
  ])('rejects %s', (_n, patch) => {
    expect(createEventSchema.safeParse({ ...baseInput, ...patch }).success).toBe(false);
  });
});

describe('updateEventSchema', () => {
  const ok = { takeoff_time: '2026-10-20T10:00:00Z', latitude: 0, longitude: 0 };
  it('defaults attachment lists and makes the type optional', () => {
    const r = updateEventSchema.parse(ok);
    expect(r.remove_attachment_ids).toEqual([]);
    expect(r.add_attachments).toEqual([]);
    expect(r.event_type_id).toBeUndefined();
  });
  it('rejects invalid coordinates', () => {
    expect(updateEventSchema.safeParse({ ...ok, latitude: -91 }).success).toBe(false);
  });
});

describe('addSupportMediaSchema', () => {
  const m = { file_name: 'a.png', file_key: 'k', file_type: 'image/png', file_size: 1 };
  it('requires at least one item', () => {
    expect(addSupportMediaSchema.safeParse({ media: [] }).success).toBe(false);
    expect(addSupportMediaSchema.safeParse({ media: [m] }).success).toBe(true);
  });
  it('limits items per upload', () => {
    expect(addSupportMediaSchema.safeParse({ media: Array(11).fill(m) }).success).toBe(false);
  });
});

// ─── scoping ──────────────────────────────────────────────────────────────────

describe('isScopedUser', () => {
  it('full-access roles are never scoped', async () => {
    expect(await isScopedUser(admin)).toBe(false);
    expect(mockPerms).not.toHaveBeenCalled();
  });
  it('a user without systems_manage is scoped', async () => {
    expect(await isScopedUser(pilot)).toBe(true);
  });
  it('a user holding systems_manage is not scoped', async () => {
    mockPerms.mockResolvedValue({ systems_manage: { level: 'full' } });
    expect(await isScopedUser(pilot)).toBe(false);
  });
});

// ─── upload URLs ──────────────────────────────────────────────────────────────

describe('createAttachmentUploadUrl', () => {
  const file = { file_name: 'my photo (1).png', content_type: 'image/png', file_size: 1000 };

  it('returns a user-scoped, sanitized key', async () => {
    const r = await createAttachmentUploadUrl(pilot, file);
    expect(r.upload_url).toBe('https://s3/upload');
    expect(r.file_key.startsWith(prefix)).toBe(true);
    expect(r.file_key).toMatch(/_my_photo__1_\.png$/);
    expect(getPresignedUploadUrl).toHaveBeenCalledWith(r.file_key, 'image/png', 600);
  });
  it('rejects disallowed types, with purpose-specific lists', async () => {
    await expect(createAttachmentUploadUrl(pilot, { ...file, content_type: 'text/html' })).rejects.toThrow('File type not allowed');
    // webp is only valid as supporting media; pdf only as a regular attachment
    await expect(createAttachmentUploadUrl(pilot, { ...file, content_type: 'image/webp' })).rejects.toThrow(EventLogbookError);
    await expect(createAttachmentUploadUrl(pilot, { ...file, content_type: 'image/webp', purpose: 'support' })).resolves.toBeDefined();
    await expect(createAttachmentUploadUrl(pilot, { ...file, content_type: 'application/pdf', purpose: 'support' })).rejects.toThrow(EventLogbookError);
  });
  it('rejects oversized files with 413', async () => {
    await expect(createAttachmentUploadUrl(pilot, { ...file, file_size: EVENT_ATTACHMENT_MAX_BYTES + 1 })).rejects.toMatchObject({ status: 413 });
  });
});

// ─── createEvent ──────────────────────────────────────────────────────────────

/** Makes getEventOptions (admin, unscoped) return one drone and one mission. */
function mockOptions() {
  db.pilot_mission.findMany.mockResolvedValue([
    {
      pilot_mission_id: 100, mission_name: 'M', mission_code: 'M-1', fk_tool_id: 10, fk_client_id: 5,
      scheduled_start: null, actual_end: null, location: null, status_name: 'PLANNED',
      pilot_mission_status: null, pilot_mission_type: null, pilot_mission_category: null, planning_logbook: null,
    },
  ]);
  db.tool.findMany.mockResolvedValue([
    { tool_id: 10, tool_name: 'Drone', tool_code: 'D1', assigned_client_id: null, location: null, tool_metadata: null },
  ]);
  db.tool_component.findMany.mockResolvedValue([]);
  db.client.findMany.mockResolvedValue([]);
}

describe('createEvent', () => {
  beforeEach(() => {
    mockOptions();
    db.pilot_mission.findUnique.mockResolvedValue({ fk_client_id: 5 });
    db.tool.findUnique.mockResolvedValue({ assigned_client_id: null, tool_metadata: null });
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 3, type_code: 'bird_strike', type_name: 'Bird strike' });
    db.event_contact.findMany.mockResolvedValue([]);
    db.pilot_event.create.mockResolvedValue({ event_id: 55 });
  });

  it('rejects a system outside the user scope (403)', async () => {
    await expect(createEvent(admin, { ...createEventSchema.parse(baseInput), tool_id: 999 })).rejects.toMatchObject({ status: 403 });
    expect(db.pilot_event.create).not.toHaveBeenCalled();
  });
  it('rejects an unknown mission (403) and a mission of another system', async () => {
    await expect(createEvent(admin, createEventSchema.parse({ ...baseInput, mission_id: 404 }))).rejects.toMatchObject({ status: 403 });
    db.tool.findMany.mockResolvedValue([
      { tool_id: 10, tool_name: 'Drone', tool_code: 'D1', assigned_client_id: null, location: null, tool_metadata: null },
      { tool_id: 11, tool_name: 'Other', tool_code: 'D2', assigned_client_id: null, location: null, tool_metadata: null },
    ]);
    await expect(createEvent(admin, createEventSchema.parse({ ...baseInput, tool_id: 11, mission_id: 100 })))
      .rejects.toThrow('Mission does not belong to the selected system');
  });
  it('rejects attachment keys outside the user prefix or with traversal (403)', async () => {
    const att = (file_key: string) => createEventSchema.parse({
      ...baseInput, attachments: [{ file_name: 'a.png', file_key, file_type: 'image/png', file_size: 1 }],
    });
    await expect(createEvent(admin, att('event-logbook/1/999/x.png'))).rejects.toMatchObject({ status: 403 });
    await expect(createEvent(admin, att(`${adminPrefix}../9/x.png`))).rejects.toMatchObject({ status: 403 });
  });
  it('rejects disallowed attachment and supporting media types', async () => {
    const key = `${adminPrefix}x`;
    await expect(createEvent(admin, createEventSchema.parse({
      ...baseInput, attachments: [{ file_name: 'a', file_key: key, file_type: 'text/html', file_size: 1 }],
    }))).rejects.toThrow('File type not allowed');
    await expect(createEvent(admin, createEventSchema.parse({
      ...baseInput, support_media: [{ file_name: 'a', file_key: key, file_type: 'application/pdf', file_size: 1 }],
    }))).rejects.toThrow('Supporting media must be an image or a video');
  });
  it('requires a client from the mission or the system', async () => {
    db.pilot_mission.findUnique.mockResolvedValue({ fk_client_id: null });
    await expect(createEvent(admin, createEventSchema.parse({ ...baseInput, mission_id: 100 })))
      .rejects.toThrow('selected mission has no client');
    await expect(createEvent(admin, createEventSchema.parse(baseInput))).rejects.toThrow('selected system has no client');
  });
  it('falls back to the system client (column, then tool_metadata.clientId)', async () => {
    db.tool.findUnique.mockResolvedValue({ assigned_client_id: 8, tool_metadata: null });
    await createEvent(admin, createEventSchema.parse(baseInput));
    expect(db.pilot_event.create.mock.calls[0][0].data.fk_client_id).toBe(8);

    db.tool.findUnique.mockResolvedValue({ assigned_client_id: null, tool_metadata: { clientId: '9' } });
    await createEvent(admin, createEventSchema.parse(baseInput));
    expect(db.pilot_event.create.mock.calls[1][0].data.fk_client_id).toBe(9);
  });
  it('rejects an event type that does not apply to the client', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue(null);
    await expect(createEvent(admin, createEventSchema.parse({ ...baseInput, mission_id: 100 }))).rejects.toThrow('Unknown event type');
  });
  it('rejects contacts from another company (404)', async () => {
    db.event_contact.findMany.mockResolvedValue([{ email: 'a@x.com' }]);
    await expect(createEvent(admin, createEventSchema.parse({ ...baseInput, mission_id: 100, notify_contact_ids: [1, 2] })))
      .rejects.toMatchObject({ status: 404 });
  });
  it('creates the event with a snapshot of the type, deduped lowercase emails and flagged support media', async () => {
    db.event_contact.findMany.mockResolvedValue([{ email: 'A@x.com' }, { email: 'a@X.com' }, { email: 'b@x.com' }]);
    const res = await createEvent(admin, createEventSchema.parse({
      ...baseInput,
      mission_id: 100,
      notes: '  hello  ',
      notify_contact_ids: [1, 1, 2, 3],
      attachments: [{ file_name: 'a.png', file_key: `${adminPrefix}a.png`, file_type: 'image/png', file_size: 5 }],
      support_media: [{ file_name: 'v.mp4', file_key: `${adminPrefix}v.mp4`, file_type: 'video/mp4', file_size: 9 }],
    }));
    expect(res).toEqual({ event_id: 55, event_type_label: 'Bird strike' });

    const data = db.pilot_event.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      fk_owner_id: 1, fk_pilot_user_id: 2, fk_tool_id: 10, fk_mission_id: 100, fk_client_id: 5,
      fk_event_type_id: 3, event_type: 'bird_strike', event_type_label: 'Bird strike', notes: 'hello',
    });
    // 3 ids requested after de-duplication, mocked rows hold duplicates by case
    expect(data.notify_emails).toEqual(['a@x.com', 'b@x.com']);
    const created = data.pilot_event_attachment.create;
    expect(created).toHaveLength(2);
    expect(created[0].is_supporting).toBeUndefined();
    expect(created[1].is_supporting).toBe(true);
    expect(created[1].file_size).toBe(BigInt(9));
  });
  it('scopes a pilot to their own missions when listing options', async () => {
    await createEvent(pilot, createEventSchema.parse(baseInput)).catch(() => undefined);
    expect(db.pilot_mission.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 1, fk_pilot_user_id: 7 });
  });
});

// ─── updateEvent / deleteEvent / addSupportMedia ─────────────────────────────

const existing = (over: Record<string, unknown> = {}) => ({
  event_id: 20, fk_owner_id: 1, fk_tool_id: 10, fk_client_id: 5, fk_event_type_id: 3,
  event_type: 'bird_strike', event_type_label: 'Bird strike',
  pilot_event_attachment: [
    { attachment_id: 1, file_key: `${prefix}one.png`, is_supporting: false },
    { attachment_id: 2, file_key: `${prefix}two.mp4`, is_supporting: true },
  ],
  ...over,
});
const upd = (patch: Record<string, unknown> = {}) =>
  updateEventSchema.parse({ takeoff_time: '2026-10-20T10:00:00Z', latitude: 1, longitude: 2, ...patch });

describe('updateEvent', () => {
  beforeEach(() => {
    db.pilot_event.findFirst.mockResolvedValue(existing());
    db.pilot_event_type.findFirst.mockResolvedValue({ event_type_id: 4, type_code: 'lost_link', type_name: 'Lost link' });
  });

  it('only finds the pilot own event when scoped', async () => {
    await updateEvent(pilot, 20, upd());
    expect(db.pilot_event.findFirst.mock.calls[0][0].where).toEqual({ event_id: 20, fk_owner_id: 1, fk_pilot_user_id: 7 });
  });
  it('404s for a missing event', async () => {
    db.pilot_event.findFirst.mockResolvedValue(null);
    await expect(updateEvent(admin, 20, upd())).rejects.toMatchObject({ status: 404 });
  });
  it('keeps the reported type when it is omitted or unchanged', async () => {
    const r = await updateEvent(admin, 20, upd({ event_type_id: 3 }));
    expect(db.pilot_event_type.findFirst).not.toHaveBeenCalled();
    expect(db.pilot_event.update.mock.calls[0][0].data.event_type).toBeUndefined();
    expect(r).toEqual({ tool_id: 10, event_type_label: 'Bird strike' });
  });
  it('snapshots the new type when switching', async () => {
    const r = await updateEvent(admin, 20, upd({ event_type_id: 4, notes: '   ' }));
    expect(db.pilot_event.update.mock.calls[0][0].data).toMatchObject({
      fk_event_type_id: 4, event_type: 'lost_link', event_type_label: 'Lost link', notes: null,
    });
    expect(r.event_type_label).toBe('Lost link');
  });
  it('rejects switching to a type that is not available for the event client', async () => {
    db.pilot_event_type.findFirst.mockResolvedValue(null);
    await expect(updateEvent(admin, 20, upd({ event_type_id: 4 }))).rejects.toThrow('Unknown event type');
    // the lookup is restricted to default types and the event client's own types
    expect(db.pilot_event_type.findFirst.mock.calls[0][0].where).toMatchObject({
      event_type_id: 4, fk_owner_id: 1, OR: [{ fk_client_id: null }, { fk_client_id: 5 }],
    });
    expect(db.pilot_event.update).not.toHaveBeenCalled();
  });
  it('404s when a scoped pilot edits an event reported by someone else', async () => {
    db.pilot_event.findFirst.mockResolvedValue(null); // the where clause filters on fk_pilot_user_id
    await expect(updateEvent(pilot, 20, upd())).rejects.toMatchObject({ status: 404 });
    expect(db.pilot_event.update).not.toHaveBeenCalled();
  });
  it('404s when removing an attachment that is not on the event', async () => {
    await expect(updateEvent(admin, 20, upd({ remove_attachment_ids: [1, 99] }))).rejects.toMatchObject({ status: 404 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('validates new attachment keys and types', async () => {
    const a = (file_key: string, file_type = 'image/png') => ({ file_name: 'n', file_key, file_type, file_size: 1 });
    await expect(updateEvent(pilot, 20, upd({ add_attachments: [a('event-logbook/1/8/n.png')] }))).rejects.toMatchObject({ status: 403 });
    await expect(updateEvent(pilot, 20, upd({ add_attachments: [a(`${prefix}n`, 'text/html')] }))).rejects.toThrow('File type not allowed');
  });
  it('enforces the attachment cap counting only non-supporting kept files', async () => {
    const adds = Array.from({ length: EVENT_ATTACHMENT_MAX_FILES }, (_, i) => ({
      file_name: `n${i}`, file_key: `${prefix}n${i}.png`, file_type: 'image/png', file_size: 1,
    }));
    // 1 original kept + 10 new = 11 > 10
    await expect(updateEvent(pilot, 20, upd({ add_attachments: adds }))).rejects.toThrow(/At most 10 attachments/);
    // removing the original makes room; the supporting media never counts
    await expect(updateEvent(pilot, 20, upd({ add_attachments: adds, remove_attachment_ids: [1] }))).resolves.toBeDefined();
  });
  it('deletes removed files from storage after the transaction', async () => {
    await updateEvent(pilot, 20, upd({ remove_attachment_ids: [1, 2] }));
    expect(db.pilot_event_attachment.deleteMany.mock.calls[0][0].where.attachment_id.in).toEqual([1, 2]);
    expect(deleteFileFromS3).toHaveBeenCalledTimes(2);
    expect(deleteFileFromS3).toHaveBeenCalledWith(`${prefix}one.png`);
  });
  it('does not fail when storage clean-up fails', async () => {
    (deleteFileFromS3 as jest.Mock).mockRejectedValueOnce(new Error('s3 down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(updateEvent(pilot, 20, upd({ remove_attachment_ids: [1] }))).resolves.toBeDefined();
  });
});

describe('deleteEvent', () => {
  it('deletes the event and its files plus the map snapshot', async () => {
    db.pilot_event.findFirst.mockResolvedValue(existing());
    const r = await deleteEvent(admin, 20);
    expect(db.pilot_event.delete).toHaveBeenCalledWith({ where: { event_id: 20 } });
    expect(r).toEqual({ event_type_label: 'Bird strike', tool_id: 10 });
    const keys = (deleteFileFromS3 as jest.Mock).mock.calls.map((c) => c[0]);
    expect(keys).toEqual(expect.arrayContaining([`${prefix}one.png`, `${prefix}two.mp4`, mapSnapshotKey(1, 20)]));
  });
  it('falls back to a prettified label for legacy events', async () => {
    db.pilot_event.findFirst.mockResolvedValue(existing({ event_type_label: null, event_type: 'bird_strike' }));
    expect((await deleteEvent(admin, 20)).event_type_label).toBe('Bird strike');
  });
  it('404s and deletes nothing for a missing event', async () => {
    db.pilot_event.findFirst.mockResolvedValue(null);
    await expect(deleteEvent(pilot, 20)).rejects.toMatchObject({ status: 404 });
    expect(db.pilot_event.delete).not.toHaveBeenCalled();
  });
});

describe('addSupportMedia', () => {
  const media = (n: number, file_type = 'image/png') =>
    Array.from({ length: n }, (_, i) => ({ file_name: `m${i}`, file_key: `${prefix}m${i}`, file_type, file_size: 1 }));

  it('creates supporting attachments and returns their ids', async () => {
    db.pilot_event.findFirst.mockResolvedValue(existing());
    let id = 100;
    db.pilot_event_attachment.create.mockImplementation(async () => ({ attachment_id: id++ }));
    const r = await addSupportMedia(pilot, 20, { media: media(2) });
    expect(r.attachment_ids).toEqual([100, 101]);
    expect(db.pilot_event_attachment.create.mock.calls[0][0].data.is_supporting).toBe(true);
  });
  it('rejects PDFs and foreign keys', async () => {
    db.pilot_event.findFirst.mockResolvedValue(existing());
    await expect(addSupportMedia(pilot, 20, { media: media(1, 'application/pdf') })).rejects.toThrow('image or a video');
    await expect(addSupportMedia(pilot, 20, { media: [{ ...media(1)[0], file_key: 'event-logbook/1/8/x' }] })).rejects.toMatchObject({ status: 403 });
  });
  it('enforces the per-event supporting media cap', async () => {
    const full = Array.from({ length: EVENT_SUPPORT_MEDIA_MAX_FILES - 1 }, (_, i) => ({ attachment_id: i, file_key: `k${i}`, is_supporting: true }));
    db.pilot_event.findFirst.mockResolvedValue(existing({ pilot_event_attachment: full }));
    await expect(addSupportMedia(pilot, 20, { media: media(2) })).rejects.toThrow(/At most 20 supporting media/);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
