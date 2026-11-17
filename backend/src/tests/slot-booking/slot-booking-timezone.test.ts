/**
 * Slot time zone: slot times are wall-clock values at the site, so "has it started", the approval day, the lock window
 * and the approval-day reminder all follow the slot group's zone, never the OPM's or a pilot's own.
 * Prisma, S3, mail and the weather lookup are mocked.
 *
 * Run:  npm test -- slot-booking-timezone
 */

const prismaMock: Record<string, any> = {
  slot: { findMany: jest.fn(), findFirst: jest.fn() },
  slot_group: { findFirst: jest.fn(), findMany: jest.fn(), updateMany: jest.fn() },
  slot_booking: { findMany: jest.fn(), groupBy: jest.fn() },
  public_users: { findMany: jest.fn(), findUnique: jest.fn() },
  notification: { createMany: jest.fn() },
  client: { findFirst: jest.fn() },
  tool: { findFirst: jest.fn(), findMany: jest.fn() },
  pilot_group: { findMany: jest.fn() },
  slot_settings: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({ getFileBufferFromS3: jest.fn(), getPresignedDownloadUrl: jest.fn(), getPresignedUploadUrl: jest.fn() }));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn().mockResolvedValue(true) }));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  isDailyEmailLimitReached: jest.fn().mockResolvedValue(false),
  incrementDailyEmailCount: jest.fn(),
}));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));
jest.mock('@/backend/services/slot-booking/slot-weather-service', () => ({ getWeatherForSlots: jest.fn() }));

import { createGroup, sendApprovalDayReminders, timezoneForLocation } from '@/backend/services/slot-booking/slot-booking-service';
import { groupZone, slotEnded, slotStarted } from '@/backend/services/slot-booking/slot-booking-rules';
import { modificationLock } from '@/lib/slot-booking-logic';
import { nextApprovalDay, normalizeTimeZone, todayInZone, wallClockNow, zonedMidnight } from '@/lib/slot-booking-utils';
import type { NewSlotGroupInput } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';

const OPM = { userId: 1, ownerId: 7, role: 'OPM', fullname: 'Opm', email: 'o@example.com', timezone: 'America/New_York' } as unknown as SessionUser;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('zone helpers', () => {
  it('reads wall-clock time and the date in a zone, not UTC', () => {
    const at = new Date('2026-11-17T22:30:00Z'); // 04:00 next day in India, 23:30 same day in Rome
    expect(todayInZone('UTC', at)).toBe('2026-11-17');
    expect(todayInZone('Europe/Rome', at)).toBe('2026-11-17');
    expect(todayInZone('Asia/Kolkata', at)).toBe('2026-11-18');
    expect(new Date(wallClockNow('Asia/Kolkata', at)).toISOString()).toBe('2026-11-18T04:00:00.000Z');
  });

  it('accepts IANA names and the legacy "IST", and rejects junk', () => {
    expect(normalizeTimeZone('IST')).toBe('Asia/Kolkata');
    expect(normalizeTimeZone('Europe/Rome')).toBe('Europe/Rome');
    expect(normalizeTimeZone('Mars/Olympus')).toBeNull();
    expect(normalizeTimeZone(undefined)).toBeNull();
  });

  it('finds the zone of a site from its coordinates', () => {
    expect(timezoneForLocation({ latitude: 28.6, longitude: 77.2 })).toBe('Asia/Kolkata');
    expect(timezoneForLocation({ latitude: 45.46, longitude: 9.19 })).toBe('Europe/Rome');
    expect(timezoneForLocation(null)).toBeNull();
  });

  it('treats a group without a stored zone as UTC', () => {
    expect(groupZone({ timezone: null })).toBe('UTC');
    expect(groupZone({ timezone: 'Asia/Kolkata' })).toBe('Asia/Kolkata');
  });

  it('computes the real instant a local day starts', () => {
    expect(new Date(zonedMidnight('2026-11-18', 'Asia/Kolkata')).toISOString()).toBe('2026-11-17T18:30:00.000Z');
    expect(new Date(zonedMidnight('2026-11-18', 'UTC')).toISOString()).toBe('2026-11-18T00:00:00.000Z');
  });
});

describe('a slot starts and ends at the site, whoever is looking', () => {
  // 01:00 UTC is 06:30 in India but 02:00 in Rome.
  const at = new Date('2026-11-17T01:00:00Z');
  it('has started in India but not in Rome', () => {
    expect(slotStarted('2026-11-17', '06:00', 'Asia/Kolkata', at)).toBe(true);
    expect(slotStarted('2026-11-17', '06:00', 'Europe/Rome', at)).toBe(false);
  });
  it('an overnight slot ends the next morning', () => {
    expect(slotEnded('2026-11-17', '22:00', '06:00', 'UTC', new Date('2026-11-18T05:00:00Z'))).toBe(false);
    expect(slotEnded('2026-11-17', '22:00', '06:00', 'UTC', new Date('2026-11-18T06:00:00Z'))).toBe(true);
  });
});

describe('approval day and lock window follow the group zone', () => {
  // 20:00 UTC on Tuesday is already Wednesday 01:30 in India.
  const at = new Date('2026-11-17T20:00:00Z');
  it('picks the local weekday', () => {
    expect(nextApprovalDay([3], at, 'UTC')?.date).toBe('2026-11-18');
    expect(nextApprovalDay([3], at, 'UTC')?.label).toBe('Wednesday');
    expect(nextApprovalDay([3], at, 'Asia/Kolkata')?.label).toBe('Today');
  });
  it('locks from local midnight of the approval day', () => {
    const india = modificationLock([3], 24, at, 'Asia/Kolkata');
    expect(india.locked).toBe(true);
    expect(india.approvalAt).toBe('2026-11-17T18:30:00.000Z');
    const utc = modificationLock([3], 24, at, 'UTC');
    expect(utc.approvalAt).toBe('2026-11-18T00:00:00.000Z');
    expect(utc.locked).toBe(true); // 4h before midnight UTC
    expect(modificationLock([3], 2, at, 'UTC').locked).toBe(false);
  });
});

describe('createGroup zone', () => {
  const later = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  const input = (over: Partial<NewSlotGroupInput> = {}): NewSlotGroupInput => ({
    name: 'G', mode: 'SHIFT', hourStart: 6, hourEnd: 22, rangeMode: 'DAY', startDate: later, blocked: false, approvalDays: [1],
    slots: [{ date: later, start: '06:00', end: '14:00' }], resolution: 'none', clientId: 5, systemId: 9, ...over,
  });

  /** Mocks everything createGroup needs after the zone is known and captures the stored group. */
  const captureStored = () => {
    const stored: { data: any } = { data: null };
    prismaMock.slot_group.findFirst.mockResolvedValue(null);
    prismaMock.client.findFirst.mockResolvedValue({ client_id: 5 });
    prismaMock.pilot_group.findMany.mockResolvedValue([]);
    prismaMock.slot.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) =>
      cb({
        $queryRaw: jest.fn(),
        slot: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
        slot_group: { create: jest.fn(async (a: any) => { stored.data = a.data; return { slot_group_id: 1 }; }) },
        slot_group_pilot_group: { createMany: jest.fn() },
      }),
    );
    return stored;
  };

  it('takes the zone from the system location, not from the OPM', async () => {
    const stored = captureStored();
    prismaMock.tool.findFirst
      .mockResolvedValueOnce({ tool_metadata: { latitude: 28.6, longitude: 77.2 }, location: null, tool_component: [] }) // zone lookup
      .mockResolvedValueOnce({ tool_id: 9, assigned_client_id: 5, tool_metadata: {} }); // system ownership check
    await createGroup(OPM, input());
    expect(stored.data.timezone).toBe('Asia/Kolkata'); // the OPM is in New York
  });

  it('lets the OPM choose a zone explicitly', async () => {
    const stored = captureStored();
    prismaMock.tool.findFirst.mockResolvedValueOnce({ tool_id: 9, assigned_client_id: 5, tool_metadata: {} });
    await createGroup(OPM, input({ timezone: 'IST' }));
    expect(stored.data.timezone).toBe('Asia/Kolkata');
  });

  it('asks the OPM to choose when there is no system location, instead of guessing their own zone', async () => {
    const err = await createGroup(OPM, input({ systemId: null })).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.extra).toMatchObject({ field: 'timezone' });
  });

  it('rejects an invalid zone', async () => {
    const err = await createGroup(OPM, input({ timezone: 'Mars/Olympus' })).catch((e) => e);
    expect(err.status).toBe(400);
    expect(err.extra).toMatchObject({ field: 'timezone' });
  });

  it('judges the start date and slots against the site zone', async () => {
    // A 00:00 slot today in the furthest-ahead zone has always already started.
    const today = todayInZone('Pacific/Kiritimati');
    const err = await createGroup(OPM, input({ timezone: 'Pacific/Kiritimati', startDate: today, slots: [{ date: today, start: '00:00', end: '06:00' }] })).catch((e) => e);
    expect(err.message).toMatch(/already started/);
  });
});

describe('approval-day reminder', () => {
  const group = (over = {}) => ({ slot_group_id: 1, fk_owner_id: 7, name: 'Week 1', approval_days: [3], timezone: 'Asia/Kolkata', ...over });
  beforeEach(() => {
    prismaMock.slot_booking.groupBy.mockResolvedValue([{ fk_slot_group_id: 1, _count: { _all: 2 } }]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 1, email: 'o@example.com' }]);
    prismaMock.slot_group.updateMany.mockResolvedValue({ count: 1 });
  });

  it('uses the local weekday of the group, so IST groups get it on their own Wednesday', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([group()]);
    // Tuesday 20:00 UTC = Wednesday 01:30 IST: the weekday matches, but it is before the reminder hour.
    expect(await sendApprovalDayReminders(new Date('2026-11-17T20:00:00Z'))).toBe(0);
    // Wednesday 03:00 UTC = 08:30 IST.
    expect(await sendApprovalDayReminders(new Date('2026-11-18T03:00:00Z'))).toBe(1);
    expect(prismaMock.slot_group.updateMany.mock.calls[0][0].data.approval_reminded_on).toEqual(new Date('2026-11-18T00:00:00.000Z'));
    expect(prismaMock.notification.createMany).toHaveBeenCalled();
  });

  it('does not send on a UTC Wednesday that is still Tuesday at the site', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([group({ timezone: 'America/Los_Angeles' })]);
    // Wednesday 03:00 UTC = Tuesday 19:00 in Los Angeles.
    expect(await sendApprovalDayReminders(new Date('2026-11-18T03:00:00Z'))).toBe(0);
    expect(prismaMock.slot_group.updateMany).not.toHaveBeenCalled();
  });

  it('claims the group so a repeated run the same day sends nothing', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([group()]);
    prismaMock.slot_group.updateMany.mockResolvedValue({ count: 0 }); // already reminded today
    expect(await sendApprovalDayReminders(new Date('2026-11-18T05:00:00Z'))).toBe(0);
    expect(prismaMock.slot_group.updateMany.mock.calls[0][0].where.OR).toEqual([
      { approval_reminded_on: null },
      { approval_reminded_on: { not: new Date('2026-11-18T00:00:00.000Z') } },
    ]);
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it('does nothing when no request is pending', async () => {
    prismaMock.slot_booking.groupBy.mockResolvedValue([]);
    expect(await sendApprovalDayReminders(new Date('2026-11-18T05:00:00Z'))).toBe(0);
  });
});
