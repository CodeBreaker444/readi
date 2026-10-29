/**
 * Event notifications: contact book, per-client default recipients, test email and
 * the "event reported" email dispatch. Prisma, mail provider, S3 and map rendering are mocked.
 *
 * Run:  npm test -- event-notifications
 */

jest.mock('@/lib/prisma', () => ({
  prisma: {
    client: { findFirst: jest.fn(), findUnique: jest.fn() },
    public_users: { findUnique: jest.fn() },
    tool: { findUnique: jest.fn() },
    pilot_mission: { findUnique: jest.fn() },
    pilot_event: { findUnique: jest.fn() },
    event_contact: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    event_default_contact: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock('@/lib/s3Client', () => ({
  deleteFileFromS3: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn(),
  putBufferToS3: jest.fn(),
}));
jest.mock('@/lib/auth/feature-permissions', () => ({ getSessionEffectivePermissions: jest.fn() }));
jest.mock('@/backend/config/env', () => ({ env: { APP_URL: 'https://app.test' } }));
jest.mock('../../../lib/resend/mail', () => ({
  sendEventReportedEmail: jest.fn(),
  sendNotificationEmail: jest.fn(),
}));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  incrementDailyEmailCount: jest.fn(),
  isDailyEmailLimitReached: jest.fn(),
}));
jest.mock('@/backend/services/logbook/event-map-snapshot', () => ({ renderMapSnapshot: jest.fn() }));

import {
  contactInputSchema,
  createContact,
  defaultContactsInputSchema,
  deleteContact,
  dispatchEventEmails,
  getDefaultContactMap,
  listContacts,
  sendTestToContact,
  setClientDefaultContacts,
  updateContact,
} from '@/backend/services/logbook/event-notification-service';
import { renderMapSnapshot } from '@/backend/services/logbook/event-map-snapshot';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '@/backend/services/email/email-limit-service';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl, putBufferToS3 } from '@/lib/s3Client';
import { sendEventReportedEmail, sendNotificationEmail } from '../../../../lib/resend/mail';

const db = prisma as any;
const mockLimit = isDailyEmailLimitReached as jest.Mock;
const mockIncrement = incrementDailyEmailCount as jest.Mock;
const mockSendEvent = sendEventReportedEmail as jest.Mock;
const mockSendNotification = sendNotificationEmail as jest.Mock;
const mockMap = renderMapSnapshot as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  db.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
  mockLimit.mockResolvedValue(false);
  (getPresignedDownloadUrl as jest.Mock).mockImplementation(
    async (key: string, _ttl: number, _name: string, disposition?: string) => `https://s3/${key}?${disposition ?? 'default'}`,
  );
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── schemas ──────────────────────────────────────────────────────────────────

describe('contactInputSchema', () => {
  it('trims, lowercases the email and allows optional fields', () => {
    expect(contactInputSchema.parse({ name: ' Ann ', email: ' ANN@Example.COM ' })).toEqual({ name: 'Ann', email: 'ann@example.com' });
  });
  it.each([
    ['blank name', { name: ' ', email: 'a@x.com' }],
    ['invalid email', { name: 'A', email: 'nope' }],
    ['long notes', { name: 'A', email: 'a@x.com', notes: 'x'.repeat(1001) }],
    ['long company', { name: 'A', email: 'a@x.com', company: 'x'.repeat(151) }],
  ])('rejects %s', (_n, input) => {
    expect(contactInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('defaultContactsInputSchema', () => {
  it('accepts up to 20 ids and rejects more or invalid ids', () => {
    expect(defaultContactsInputSchema.safeParse({ contact_ids: Array.from({ length: 20 }, (_, i) => i + 1) }).success).toBe(true);
    expect(defaultContactsInputSchema.safeParse({ contact_ids: Array.from({ length: 21 }, (_, i) => i + 1) }).success).toBe(false);
    expect(defaultContactsInputSchema.safeParse({ contact_ids: [0] }).success).toBe(false);
  });
});

// ─── contact book ─────────────────────────────────────────────────────────────

describe('contacts', () => {
  it('listContacts returns only the public fields', async () => {
    db.event_contact.findMany.mockResolvedValue([{ contact_id: 1, name: 'A', company: null, notes: null, email: 'a@x.com', fk_owner_id: 1, created_by: 3 }]);
    expect(await listContacts(1)).toEqual([{ contact_id: 1, name: 'A', company: null, notes: null, email: 'a@x.com' }]);
    expect(db.event_contact.findMany.mock.calls[0][0].where).toEqual({ fk_owner_id: 1 });
  });

  describe('createContact', () => {
    it('stores blank optional fields as null and returns the id', async () => {
      db.event_contact.findFirst.mockResolvedValue(null);
      db.event_contact.create.mockResolvedValue({ contact_id: 8 });
      const id = await createContact(1, 2, { name: 'A', email: 'a@x.com', company: '  ', notes: ' hi ' });
      expect(id).toBe(8);
      expect(db.event_contact.create.mock.calls[0][0].data).toMatchObject({
        fk_owner_id: 1, name: 'A', company: null, notes: 'hi', email: 'a@x.com', created_by: 2,
      });
    });
    it('409s on a duplicate email within the company (case-insensitive)', async () => {
      db.event_contact.findFirst.mockResolvedValue({ contact_id: 1 });
      await expect(createContact(1, 2, { name: 'A', email: 'a@x.com' })).rejects.toMatchObject({ status: 409 });
      expect(db.event_contact.findFirst.mock.calls[0][0].where).toMatchObject({
        fk_owner_id: 1, email: { equals: 'a@x.com', mode: 'insensitive' },
      });
      expect(db.event_contact.create).not.toHaveBeenCalled();
    });
  });

  describe('updateContact', () => {
    beforeEach(() => db.event_contact.findFirst.mockResolvedValueOnce({ contact_id: 4, name: 'A' }));

    it('404s for a contact of another company', async () => {
      db.event_contact.findFirst.mockReset();
      db.event_contact.findFirst.mockResolvedValue(null);
      await expect(updateContact(1, 4, { name: 'B' })).rejects.toMatchObject({ status: 404 });
      expect(db.event_contact.update).not.toHaveBeenCalled();
    });
    it('writes only provided fields and clears blank ones', async () => {
      await updateContact(1, 4, { company: ' ', name: 'B' });
      const data = db.event_contact.update.mock.calls[0][0].data;
      expect(Object.keys(data).sort()).toEqual(['company', 'name', 'updated_at']);
      expect(data.company).toBeNull();
    });
    it('409s when the new email belongs to another contact, excluding itself', async () => {
      db.event_contact.findFirst.mockResolvedValueOnce({ contact_id: 5 });
      await expect(updateContact(1, 4, { email: 'b@x.com' })).rejects.toMatchObject({ status: 409 });
      expect(db.event_contact.findFirst.mock.calls[1][0].where.NOT).toEqual({ contact_id: 4 });
    });
  });

  it('deleteContact 404s when missing and deletes otherwise', async () => {
    db.event_contact.findFirst.mockResolvedValueOnce(null);
    await expect(deleteContact(1, 4)).rejects.toMatchObject({ status: 404 });
    db.event_contact.findFirst.mockResolvedValueOnce({ contact_id: 4 });
    await deleteContact(1, 4);
    expect(db.event_contact.delete).toHaveBeenCalledWith({ where: { contact_id: 4 } });
  });
});

describe('sendTestToContact', () => {
  beforeEach(() => db.event_contact.findFirst.mockResolvedValue({ contact_id: 4, name: 'Ann', email: 'ann@x.com' }));

  it('emails the contact and counts it against the daily limit', async () => {
    await sendTestToContact(1, 4);
    expect(mockSendNotification).toHaveBeenCalledWith(['ann@x.com'], expect.stringContaining('test'), expect.stringContaining('Hello Ann'), 'event_logbook_test');
    expect(mockIncrement).toHaveBeenCalledWith(1);
  });
  it('429s without sending when the daily limit is reached', async () => {
    mockLimit.mockResolvedValue(true);
    await expect(sendTestToContact(1, 4)).rejects.toMatchObject({ status: 429 });
    expect(mockSendNotification).not.toHaveBeenCalled();
    expect(mockIncrement).not.toHaveBeenCalled();
  });
  it('does not count the email when sending fails', async () => {
    mockSendNotification.mockRejectedValue(new Error('smtp'));
    await expect(sendTestToContact(1, 4)).rejects.toThrow('smtp');
    expect(mockIncrement).not.toHaveBeenCalled();
  });
  it('404s for an unknown contact', async () => {
    db.event_contact.findFirst.mockResolvedValue(null);
    await expect(sendTestToContact(1, 4)).rejects.toMatchObject({ status: 404 });
  });
});

// ─── per-client defaults ─────────────────────────────────────────────────────

describe('getDefaultContactMap', () => {
  it('groups contact ids by client, keeping order', async () => {
    db.event_default_contact.findMany.mockResolvedValue([
      { fk_client_id: 5, fk_contact_id: 1 }, { fk_client_id: 6, fk_contact_id: 3 }, { fk_client_id: 5, fk_contact_id: 2 },
    ]);
    expect(await getDefaultContactMap(1)).toEqual({ 5: [1, 2], 6: [3] });
  });
  it('returns an empty map', async () => {
    db.event_default_contact.findMany.mockResolvedValue([]);
    expect(await getDefaultContactMap(1)).toEqual({});
  });
});

describe('setClientDefaultContacts', () => {
  beforeEach(() => db.client.findFirst.mockResolvedValue({ client_id: 5 }));

  it('404s for a client of another company', async () => {
    db.client.findFirst.mockResolvedValue(null);
    await expect(setClientDefaultContacts(1, 5, [1])).rejects.toMatchObject({ status: 404 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('404s when a contact is not in the company, leaving the old defaults untouched', async () => {
    db.event_contact.count.mockResolvedValue(1);
    await expect(setClientDefaultContacts(1, 5, [1, 2])).rejects.toMatchObject({ status: 404 });
    expect(db.event_default_contact.deleteMany).not.toHaveBeenCalled();
  });
  it('replaces the defaults with the de-duplicated list', async () => {
    db.event_contact.count.mockResolvedValue(2);
    await setClientDefaultContacts(1, 5, [1, 2, 2]);
    expect(db.event_contact.count.mock.calls[0][0].where).toEqual({ fk_owner_id: 1, contact_id: { in: [1, 2] } });
    expect(db.event_default_contact.deleteMany).toHaveBeenCalledWith({ where: { fk_owner_id: 1, fk_client_id: 5 } });
    expect(db.event_default_contact.createMany.mock.calls[0][0].data).toEqual([
      { fk_owner_id: 1, fk_client_id: 5, fk_contact_id: 1 },
      { fk_owner_id: 1, fk_client_id: 5, fk_contact_id: 2 },
    ]);
  });
  it('an empty list clears the defaults without counting contacts', async () => {
    await setClientDefaultContacts(1, 5, []);
    expect(db.event_contact.count).not.toHaveBeenCalled();
    expect(db.event_default_contact.deleteMany).toHaveBeenCalled();
    expect(db.event_default_contact.createMany.mock.calls[0][0].data).toEqual([]);
  });
});

// ─── dispatchEventEmails ──────────────────────────────────────────────────────

const eventRow = (over: Record<string, unknown> = {}) => ({
  event_id: 20, fk_owner_id: 1, fk_pilot_user_id: 7, fk_tool_id: 10, fk_mission_id: 100, fk_client_id: 5,
  event_type: 'bird_strike', event_type_label: 'Bird strike',
  takeoff_time: new Date('2026-10-20T10:05:00Z'), created_at: new Date('2026-10-20T11:30:00Z'),
  latitude: '45.1', longitude: '9.2', location_label: 'Field', notes: 'n',
  notify_emails: ['a@x.com', 'b@x.com'],
  pilot_event_attachment: [
    { file_name: 'a.png', file_type: 'image/png', file_key: 'k1' },
    { file_name: 'r.pdf', file_type: 'application/pdf', file_key: 'k2' },
  ],
  ...over,
});

function mockEvent(event: unknown = eventRow()) {
  db.pilot_event.findUnique.mockResolvedValue(event);
  db.public_users.findUnique.mockResolvedValue({ first_name: 'Ann', last_name: 'Lee' });
  db.tool.findUnique.mockResolvedValue({ tool_name: 'Drone', tool_code: 'D1' });
  db.pilot_mission.findUnique.mockResolvedValue({ mission_name: 'Roof', mission_code: 'M-1' });
  db.client.findUnique.mockResolvedValue({ client_name: 'Acme' });
  mockSendEvent.mockResolvedValue(true);
  mockMap.mockResolvedValue(Buffer.from('png'));
}

const sentPayload = () => mockSendEvent.mock.calls[0][2];

describe('dispatchEventEmails', () => {
  it('does nothing for an unknown event', async () => {
    db.pilot_event.findUnique.mockResolvedValue(null);
    await dispatchEventEmails(20);
    expect(mockSendEvent).not.toHaveBeenCalled();
  });

  it('sends nothing when no recipients were selected', async () => {
    mockEvent(eventRow({ notify_emails: [] }));
    await dispatchEventEmails(20);
    expect(mockSendEvent).not.toHaveBeenCalled();
    expect(db.public_users.findUnique).not.toHaveBeenCalled();
  });

  it('skips the email when the daily limit is reached', async () => {
    mockEvent();
    mockLimit.mockResolvedValue(true);
    await dispatchEventEmails(20);
    expect(mockSendEvent).not.toHaveBeenCalled();
    expect(mockIncrement).not.toHaveBeenCalled();
  });

  it('emails the snapshotted recipients with details, map, attachments and a deep link', async () => {
    mockEvent();
    await dispatchEventEmails(20);

    const [recipients, subject, payload] = mockSendEvent.mock.calls[0];
    expect(recipients).toEqual(['a@x.com', 'b@x.com']);
    expect(subject).toBe('New event reported: Bird strike');
    expect(payload).toMatchObject({
      eventLabel: 'Bird strike',
      notes: 'n',
      viewUrl: 'https://app.test/logbooks/event-logbook?event=20',
      mapLinkUrl: 'https://www.google.com/maps?q=45.1,9.2',
      mapImageUrl: 'https://s3/event-logbook/1/maps/20.png?inline',
    });
    expect(payload.rows).toEqual([
      { label: 'Event', value: 'Bird strike' },
      { label: 'Takeoff time', value: '2026-10-20 10:05 UTC' },
      { label: 'Reported', value: '2026-10-20 11:30 UTC' },
      { label: 'Pilot', value: 'Ann Lee' },
      { label: 'Drone', value: 'Drone (D1)' },
      { label: 'Client', value: 'Acme' },
      { label: 'Mission', value: 'Roof' },
      { label: 'Location', value: 'Field' },
      { label: 'Coordinates', value: '45.1, 9.2' },
    ]);
    expect(payload.attachments).toEqual([
      { name: 'a.png', isImage: true, previewUrl: 'https://s3/k1?inline', downloadUrl: 'https://s3/k1?attachment' },
      { name: 'r.pdf', isImage: false, previewUrl: 'https://s3/k2?inline', downloadUrl: 'https://s3/k2?attachment' },
    ]);
    expect(putBufferToS3).toHaveBeenCalledWith('event-logbook/1/maps/20.png', expect.any(Buffer), 'image/png');
    expect(mockIncrement).toHaveBeenCalledWith(1);
  });

  it('omits optional rows and the map when the event has no mission, client, label or coordinates', async () => {
    mockEvent(eventRow({ fk_mission_id: null, fk_client_id: null, location_label: null, latitude: null, longitude: null }));
    await dispatchEventEmails(20);
    expect(sentPayload().rows.map((r: any) => r.label)).toEqual(['Event', 'Takeoff time', 'Reported', 'Pilot', 'Drone']);
    expect(sentPayload()).toMatchObject({ mapImageUrl: null, mapLinkUrl: null });
    expect(mockMap).not.toHaveBeenCalled();
  });

  it('falls back to a prettified label and dashes for missing pilot/drone', async () => {
    mockEvent(eventRow({ event_type_label: null }));
    db.public_users.findUnique.mockResolvedValue(null);
    db.tool.findUnique.mockResolvedValue(null);
    await dispatchEventEmails(20);
    expect(mockSendEvent.mock.calls[0][1]).toBe('New event reported: Bird strike');
    const rows = Object.fromEntries(sentPayload().rows.map((r: any) => [r.label, r.value]));
    expect(rows.Pilot).toBe('—');
    expect(rows.Drone).toBe('—');
  });

  it('still sends the email without a map when the snapshot cannot be rendered', async () => {
    mockEvent();
    mockMap.mockResolvedValue(null);
    await dispatchEventEmails(20);
    expect(sentPayload().mapImageUrl).toBeNull();
    expect(mockSendEvent).toHaveBeenCalledTimes(1);
  });

  it('still sends the email when storing the map fails', async () => {
    mockEvent();
    (putBufferToS3 as jest.Mock).mockRejectedValue(new Error('s3'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await dispatchEventEmails(20);
    expect(sentPayload().mapImageUrl).toBeNull();
    expect(mockSendEvent).toHaveBeenCalledTimes(1);
  });

  it('does not count the email when the provider reports it was not sent', async () => {
    mockEvent();
    mockSendEvent.mockResolvedValue(false);
    await dispatchEventEmails(20);
    expect(mockIncrement).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    db.pilot_event.findUnique.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(dispatchEventEmails(20)).resolves.toBeUndefined();
    mockEvent();
    mockSendEvent.mockRejectedValue(new Error('smtp'));
    await expect(dispatchEventEmails(20)).resolves.toBeUndefined();
  });
});
