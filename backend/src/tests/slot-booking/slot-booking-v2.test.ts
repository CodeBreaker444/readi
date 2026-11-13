/**
 * Slot Booking v2 service flows: client + scheduled publishing + pilot-group audience, hidden groups,
 * collisions, the modification lock, moving a request, direct assignment, day preview, merits and publish notices.
 * Prisma, S3, mail and the weather lookup are mocked.
 *
 * Run:  npm test -- slot-booking-v2
 */

const prismaMock: Record<string, any> = {
  slot: { findMany: jest.fn(), findFirst: jest.fn() },
  slot_group: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  slot_booking: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
  public_users: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
  notification: { createMany: jest.fn() },
  client: { findFirst: jest.fn(), findMany: jest.fn() },
  pilot_group: { findMany: jest.fn() },
  pilot_group_member: { findMany: jest.fn() },
  slot_group_pilot_group: { findMany: jest.fn() },
  slot_settings: { findUnique: jest.fn() },
  pilot_mission: { groupBy: jest.fn(), findMany: jest.fn() },
  pilot_flight_limit: { findMany: jest.fn(), deleteMany: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({
  getFileBufferFromS3: jest.fn(),
  getPresignedDownloadUrl: async (k: string) => `https://s3.example/${k}`, // plain function: resetAllMocks must not clear it
  getPresignedUploadUrl: jest.fn(),
}));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn().mockResolvedValue(true) }));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  isDailyEmailLimitReached: jest.fn().mockResolvedValue(false),
  incrementDailyEmailCount: jest.fn(),
}));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));
const getWeatherForSlots = jest.fn();
jest.mock('@/backend/services/slot-booking/slot-weather-service', () => ({
  ...jest.requireActual('@/backend/services/slot-booking/slot-weather-service'),
  getWeatherForSlots: (...a: unknown[]) => getWeatherForSlots(...a),
}));

import { getDayPreview, getSlotCandidates, assignPilot, unassignPilot } from '@/backend/services/slot-booking/slot-assignment-service';
import { getMerits, getMyStats } from '@/backend/services/slot-booking/pilot-stats-service';
import {
  approveBooking,
  cancelBooking,
  createGroup,
  getGroupDetail,
  listGroups,
  listMyBookings,
  moveBooking,
  publishGroupNow,
  requestBooking,
  sendPublishNotifications,
  SlotBookingError,
} from '@/backend/services/slot-booking/slot-booking-service';
import type { NewSlotGroupInput } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { addDaysIso, todayIso } from '@/lib/slot-booking-utils';

const user = (role: string, userId = 1): SessionUser => ({ userId, ownerId: 7, role, fullname: `User ${userId}`, email: `u${userId}@example.com` }) as unknown as SessionUser;
const OPM = user('OPM');
const PIC = user('PIC', 2);

const day = (n: number) => addDaysIso(todayIso(), n);
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const flush = () => new Promise((r) => setTimeout(r, 0));

const rejects = async (p: Promise<unknown>, status: number, message?: RegExp) => {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(SlotBookingError);
  expect((err as SlotBookingError).status).toBe(status);
  if (message) expect((err as SlotBookingError).message).toMatch(message);
  return err as SlotBookingError;
};

const slotRow = (over: Record<string, unknown> = {}, groupOver: Record<string, unknown> = {}) => ({
  slot_id: 5,
  fk_slot_group_id: 3,
  slot_date: d(day(2)),
  start_time: '06:00',
  end_time: '14:00',
  is_active: true,
  slot_group: { slot_group_id: 3, name: 'Week 1', is_blocked: false, approval_days: [1], publish_at: null, fk_client_id: null, ...groupOver },
  ...over,
});

const txOver = (tx: Record<string, unknown>) =>
  prismaMock.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb({ $queryRaw: jest.fn(), ...tx }));

beforeEach(() => {
  jest.resetAllMocks();
  prismaMock.slot_booking.findMany.mockResolvedValue([]);
  prismaMock.slot_group_pilot_group.findMany.mockResolvedValue([]);
  prismaMock.pilot_group_member.findMany.mockResolvedValue([]);
  prismaMock.pilot_group.findMany.mockResolvedValue([]);
  prismaMock.slot_settings.findUnique.mockResolvedValue(null);
  prismaMock.public_users.findMany.mockResolvedValue([]);
  prismaMock.public_users.findUnique.mockResolvedValue(null);
  prismaMock.client.findMany.mockResolvedValue([]);
  prismaMock.pilot_flight_limit.findMany.mockResolvedValue([]);
  prismaMock.pilot_mission.groupBy.mockResolvedValue([]);
  prismaMock.pilot_mission.findMany.mockResolvedValue([]);
  prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
  getWeatherForSlots.mockResolvedValue({ weather: {}, note: null });
});

// ───────────────────────── Publishing: client, schedule, audience ─────────────────────────

describe('createGroup: client, scheduled publishing and audience', () => {
  const input = (over: Partial<NewSlotGroupInput> = {}): NewSlotGroupInput => ({
    name: 'Week 9',
    mode: 'SHIFT',
    hourStart: 6,
    hourEnd: 22,
    rangeMode: 'DAY',
    startDate: day(3),
    blocked: false,
    approvalDays: [1],
    slots: [{ date: day(3), start: '06:00', end: '14:00' }],
    resolution: 'none',
    ...over,
  });
  beforeEach(() => {
    prismaMock.slot_group.findFirst.mockResolvedValue(null);
    prismaMock.slot.findMany.mockResolvedValue([]);
  });

  it('rejects a publish time in the past or too close', async () => {
    const e = await rejects(createGroup(OPM, input({ publishAt: new Date(Date.now() - 3600_000).toISOString() })), 400, /future/);
    expect(e.extra).toMatchObject({ field: 'publishAt' });
    await rejects(createGroup(OPM, input({ publishAt: 'garbage' })), 400, /Invalid/);
    // after the only slot day (day 3) -> pointless
    await rejects(createGroup(OPM, input({ publishAt: new Date(Date.now() + 10 * 86_400_000).toISOString() })), 400, /on or before the last slot day/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a client of another company', async () => {
    prismaMock.client.findFirst.mockResolvedValue(null);
    const e = await rejects(createGroup(OPM, input({ clientId: 99 })), 400, /client/);
    expect(e.extra).toMatchObject({ field: 'clientId' });
    expect(prismaMock.client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { client_id: 99, fk_owner_id: 7 } }));
  });

  it('rejects pilot groups that are not the company’s', async () => {
    prismaMock.pilot_group.findMany.mockResolvedValue([{ pilot_group_id: 1 }]);
    const e = await rejects(createGroup(OPM, input({ pilotGroupIds: [1, 2] })), 400, /pilot groups/);
    expect(e.extra).toMatchObject({ field: 'pilotGroupIds' });
  });

  it('stores the client, the publish time and the audience', async () => {
    prismaMock.client.findFirst.mockResolvedValue({ client_id: 4 });
    prismaMock.pilot_group.findMany.mockResolvedValue([{ pilot_group_id: 1 }, { pilot_group_id: 2 }]);
    const groupCreate = jest.fn().mockResolvedValue({ slot_group_id: 30 });
    const audience = jest.fn();
    txOver({ slot_group: { create: groupCreate }, slot_group_pilot_group: { createMany: audience }, slot: { createMany: jest.fn() } });
    const when = new Date(Date.now() + 3 * 86_400_000).toISOString();

    await createGroup(OPM, input({ clientId: 4, publishAt: when, pilotGroupIds: [1, 2, 2] }));

    expect(groupCreate.mock.calls[0][0].data).toMatchObject({ fk_client_id: 4, publish_at: new Date(when) });
    expect(audience).toHaveBeenCalledWith({
      data: [
        { fk_slot_group_id: 30, fk_pilot_group_id: 1 },
        { fk_slot_group_id: 30, fk_pilot_group_id: 2 },
      ],
    });
  });

  it('publishes immediately without a client or audience by default', async () => {
    const groupCreate = jest.fn().mockResolvedValue({ slot_group_id: 31 });
    const audience = jest.fn();
    txOver({ slot_group: { create: groupCreate }, slot_group_pilot_group: { createMany: audience }, slot: { createMany: jest.fn() } });
    await createGroup(OPM, input());
    expect(groupCreate.mock.calls[0][0].data).toMatchObject({ fk_client_id: null, publish_at: null });
    expect(audience).not.toHaveBeenCalled();
  });
});

describe('what pilots can see', () => {
  const groupRow = (id: number, over: Record<string, unknown> = {}) => ({
    slot_group_id: id,
    fk_owner_id: 7,
    name: `G${id}`,
    description: null,
    slot_mode: 'SHIFT',
    hour_start: 6,
    hour_end: 22,
    range_mode: 'WEEK',
    start_date: d(day(1)),
    is_blocked: false,
    approval_days: [1],
    created_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    fk_client_id: null,
    publish_at: null,
    ...over,
  });

  beforeEach(() => {
    prismaMock.slot.groupBy = jest.fn().mockResolvedValue([]);
    prismaMock.slot_booking.groupBy = jest.fn().mockResolvedValue([]);
  });

  it('hides scheduled groups and groups offered only to other pilot groups', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([
      groupRow(1),
      groupRow(2, { publish_at: new Date(Date.now() + 86_400_000) }), // not yet
      groupRow(3), // experts only
      groupRow(4), // my group
      groupRow(5, { publish_at: new Date(Date.now() - 1000) }), // already opened
    ]);
    prismaMock.slot_group_pilot_group.findMany.mockResolvedValue([
      { fk_slot_group_id: 3, fk_pilot_group_id: 10 },
      { fk_slot_group_id: 4, fk_pilot_group_id: 11 },
    ]);
    prismaMock.pilot_group_member.findMany.mockResolvedValue([{ fk_pilot_group_id: 11 }]);

    const seen = (await listGroups(PIC)).map((g) => g.id);
    expect(seen).toEqual([1, 4, 5]);
  });

  it('shows the manager everything, flagging scheduled groups', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([groupRow(1), groupRow(2, { publish_at: new Date(Date.now() + 86_400_000) })]);
    const all = await listGroups(OPM);
    expect(all.map((g) => [g.id, g.published])).toEqual([[1, true], [2, false]]);
  });

  it('answers 404 when a pilot opens or requests a hidden group', async () => {
    const hidden = groupRow(2, { publish_at: new Date(Date.now() + 86_400_000) });
    prismaMock.slot_group.findFirst.mockResolvedValue(hidden);
    await rejects(getGroupDetail(PIC, 2), 404);

    prismaMock.slot.findFirst.mockResolvedValue(slotRow({}, { publish_at: new Date(Date.now() + 86_400_000) }));
    await rejects(requestBooking(PIC, 5), 404);
  });

  it('names the approved pilot for everyone but keeps other requests private', async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue(groupRow(3));
    prismaMock.slot.findMany.mockResolvedValue([]);
    prismaMock.slot_booking.findMany.mockResolvedValue([
      { booking_id: 1, fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 8, status: 'APPROVED', requested_at: new Date(), decided_at: new Date(), decision_note: 'secret', pdf_file_name: 'a.pdf' },
      { booking_id: 2, fk_slot_id: 6, fk_slot_group_id: 3, fk_pilot_user_id: 9, status: 'PENDING', requested_at: new Date(), decided_at: null, decision_note: null, pdf_file_name: null },
    ]);
    prismaMock.public_users.findMany.mockResolvedValue([
      { user_id: 8, first_name: 'Ada', last_name: 'Lovelace', username: 'ada' },
      { user_id: 9, first_name: 'Bob', last_name: 'Builder', username: 'bob' },
    ]);
    const { bookings } = await getGroupDetail(PIC, 3);
    const approved = bookings.find((b) => b.id === 1)!;
    expect(approved).toMatchObject({ picId: 8, picName: 'Ada Lovelace', note: null, pdfName: null });
    expect(bookings.find((b) => b.id === 2)).toMatchObject({ picId: -1, picName: 'Another pilot' });
  });

  it('shows the manager overlapping assignments of pending requests and the forecast', async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue(groupRow(3));
    prismaMock.slot.findMany.mockResolvedValue([
      { slot_id: 5, fk_slot_group_id: 3, slot_date: d(day(2)), start_time: '06:00', end_time: '14:00', is_active: true },
    ]);
    prismaMock.slot_booking.findMany
      .mockResolvedValueOnce([{ booking_id: 2, fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 9, status: 'PENDING', requested_at: new Date(), decided_at: null, decision_note: null, pdf_file_name: null }])
      // collision lookup: pilot 9 is approved in another group on the same morning
      .mockResolvedValueOnce([{ fk_slot_id: 77, fk_pilot_user_id: 9, slot: { slot_date: d(day(2)), start_time: '08:00', end_time: '10:00', slot_group: { name: 'Other' } } }]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 9, first_name: 'Bob', last_name: 'B', username: 'bob' }]);
    getWeatherForSlots.mockResolvedValue({ weather: { 5: { level: 'tough' } }, note: null });

    const detail = await getGroupDetail(OPM, 3);
    expect(detail.bookings[0].collision).toMatch(/08:00–10:00 in “Other”/);
    expect(detail.weather).toEqual({ 5: { level: 'tough' } });
  });

  it("gives the manager each pilot's profile: flights, recent weekend flying, merit and what they asked for in this group", async () => {
    const sat = '2030-06-01';
    const mon = '2030-06-03';
    prismaMock.slot_group.findFirst.mockResolvedValue(groupRow(3));
    prismaMock.slot.findMany.mockResolvedValue([
      { slot_id: 5, fk_slot_group_id: 3, slot_date: d(sat), start_time: '06:00', end_time: '14:00', is_active: true },
      { slot_id: 6, fk_slot_group_id: 3, slot_date: d(mon), start_time: '06:00', end_time: '14:00', is_active: true },
      { slot_id: 7, fk_slot_group_id: 3, slot_date: d(mon), start_time: '14:00', end_time: '22:00', is_active: true },
    ]);
    const base = { fk_slot_group_id: 3, fk_pilot_user_id: 9, requested_at: new Date(), decided_at: null, pdf_file_name: null };
    prismaMock.slot_booking.findMany
      .mockResolvedValueOnce([
        { ...base, booking_id: 1, fk_slot_id: 5, status: 'PENDING', decision_note: null },
        { ...base, booking_id: 2, fk_slot_id: 6, status: 'REJECTED', decision_note: 'No' },
        // placed by the OPM: not something the pilot asked for
        { ...base, booking_id: 3, fk_slot_id: 7, status: 'APPROVED', decision_note: 'Assigned by OPM' },
      ])
      .mockResolvedValue([]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 9, first_name: 'Bob', last_name: 'B', username: 'bob', user_role: 'PIC', email: null, users_profile: null }]);
    prismaMock.pilot_mission.groupBy.mockResolvedValue([{ fk_pilot_user_id: 9, _count: { _all: 42 }, _sum: { flight_duration: 600 } }]);
    // two flights in the last week: one on a Saturday, one on a Monday
    prismaMock.pilot_mission.findMany.mockResolvedValue([
      { fk_pilot_user_id: 9, actual_start: new Date('2030-05-25T09:00:00.000Z') },
      { fk_pilot_user_id: 9, actual_start: new Date('2030-05-27T09:00:00.000Z') },
    ]);

    const { bookings } = await getGroupDetail(OPM, 3);
    const profile = bookings.find((b) => b.id === 1)!.profile!;
    expect(profile.totalFlights).toBe(42);
    expect(profile.appliedInGroup).toBe(2);
    expect(profile.appliedWeekendInGroup).toBe(1);
    expect(profile).toEqual(expect.objectContaining({ weekFlights: expect.any(Number), weekWeekendFlights: expect.any(Number), groups: expect.any(Array) }));
  });

  it("does not give pilots anyone's profile", async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue(groupRow(3));
    prismaMock.slot.findMany.mockResolvedValue([{ slot_id: 5, fk_slot_group_id: 3, slot_date: d(day(2)), start_time: '06:00', end_time: '14:00', is_active: true }]);
    prismaMock.slot_booking.findMany.mockResolvedValueOnce([
      { booking_id: 1, fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 2, status: 'PENDING', requested_at: new Date(), decided_at: null, decision_note: null, pdf_file_name: null },
    ]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2, first_name: 'Pia', last_name: 'P', username: 'pia' }]);
    const { bookings } = await getGroupDetail(PIC, 3);
    expect(bookings[0].profile).toBeUndefined();
  });
});

// ───────────────────────── Collisions ─────────────────────────

describe('collisions', () => {
  const clashRow = { fk_slot_id: 77, fk_pilot_user_id: 2, slot: { slot_date: d(day(2)), start_time: '10:00', end_time: '18:00', slot_group: { name: 'Group B' } } };

  it('stops a pilot requesting a slot that overlaps one they already hold in another group', async () => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow());
    prismaMock.slot_booking.findMany.mockResolvedValueOnce([clashRow]);
    const e = await rejects(requestBooking(PIC, 5), 409, /overlapping slot/);
    expect(e.extra?.collision).toMatch(/Group B/);
  });

  it('does not count back-to-back slots as a collision', async () => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow());
    prismaMock.slot_booking.findMany.mockResolvedValueOnce([{ ...clashRow, slot: { ...clashRow.slot, start_time: '14:00', end_time: '22:00' } }]);
    txOver({ slot_booking: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ booking_id: 1 }) } });
    await expect(requestBooking(PIC, 5)).resolves.toHaveProperty('reviewDay');
  });

  it('stops the OPM approving a request that would double-book the pilot', async () => {
    prismaMock.slot_booking.findFirst.mockResolvedValue({
      booking_id: 9, fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 2, status: 'PENDING', slot: slotRow(),
    });
    prismaMock.slot_booking.findMany.mockResolvedValueOnce([clashRow]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2, first_name: 'Pia', last_name: 'Pilot', username: 'pia' }]);
    const e = await rejects(approveBooking(OPM, 9), 409, /Pia Pilot is already assigned/);
    expect(e.extra?.collision).toMatch(/Group B/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

// ───────────────────────── Modification lock ─────────────────────────

describe('pilots changing their requests', () => {
  // A group whose approval day is every weekday means "today is an approval day" -> always inside the lock window.
  const everyDay = [0, 1, 2, 3, 4, 5, 6];
  const pending = (approvalDays: number[]) => ({
    booking_id: 9, fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 2, status: 'PENDING',
    slot: slotRow({}, { approval_days: approvalDays }),
  });

  it('refuses to cancel inside the lock window and says when the approval day is', async () => {
    prismaMock.slot_booking.findFirst.mockResolvedValue(pending(everyDay));
    const e = await rejects(cancelBooking(PIC, 9), 409, /locked 24 hours/);
    expect(e.extra).toMatchObject({ locked: true });
    expect(prismaMock.slot_booking.delete).not.toHaveBeenCalled();
  });

  it('uses the company’s lock setting (48h) and lets 0 switch the lock off', async () => {
    prismaMock.slot_booking.findFirst.mockResolvedValue(pending(everyDay));
    prismaMock.slot_settings.findUnique.mockResolvedValue({ modify_lock_hours: 48 });
    await rejects(cancelBooking(PIC, 9), 409, /locked 48 hours/);

    prismaMock.slot_settings.findUnique.mockResolvedValue({ modify_lock_hours: 0 });
    prismaMock.slot_booking.delete.mockResolvedValue({});
    await expect(cancelBooking(PIC, 9)).resolves.toBeUndefined();
    expect(prismaMock.slot_booking.delete).toHaveBeenCalledWith({ where: { booking_id: 9 } });
  });

  it('still cancels when the approval day is far away', async () => {
    // Pick the weekday that is 4 days from now: further than 48h whatever today is.
    const far = new Date(Date.now() + 4 * 86_400_000).getUTCDay();
    prismaMock.slot_booking.findFirst.mockResolvedValue(pending([far]));
    prismaMock.slot_booking.delete.mockResolvedValue({});
    await expect(cancelBooking(PIC, 9)).resolves.toBeUndefined();
  });

  it('marks locked requests in the pilot’s own list', async () => {
    const row = (id: number, status: string, approvalDays: number[]) => ({
      booking_id: id, status, requested_at: new Date(), decided_at: null, decision_note: null, pdf_file_name: null, fk_pilot_user_id: 2,
      slot: { slot_date: d(day(2)), start_time: '06:00', end_time: '14:00', slot_group: { slot_group_id: 3, name: 'G', approval_days: approvalDays } },
    });
    prismaMock.slot_booking.findMany.mockResolvedValue([row(1, 'PENDING', everyDay), row(2, 'APPROVED', everyDay)]);
    const rows = await listMyBookings(PIC);
    expect(rows.map((r) => [r.bookingId, r.locked])).toEqual([[1, true], [2, false]]);
  });

  describe('moveBooking', () => {
    it('refuses inside the lock window', async () => {
      prismaMock.slot_booking.findFirst.mockResolvedValue(pending(everyDay));
      await rejects(moveBooking(PIC, 9, 6), 409, /locked/);
    });

    it('only moves within the same slot group', async () => {
      const far = new Date(Date.now() + 4 * 86_400_000).getUTCDay();
      prismaMock.slot_booking.findFirst.mockResolvedValue(pending([far]));
      prismaMock.slot.findFirst.mockResolvedValue(slotRow({ slot_id: 6, fk_slot_group_id: 99 }));
      await rejects(moveBooking(PIC, 9, 6), 400, /same slot group/);
    });

    it('refuses the same slot, a full blocked slot and a closed slot', async () => {
      const far = new Date(Date.now() + 4 * 86_400_000).getUTCDay();
      prismaMock.slot_booking.findFirst.mockResolvedValue(pending([far]));
      await rejects(moveBooking(PIC, 9, 5), 400, /different slot/);

      prismaMock.slot.findFirst.mockResolvedValue(slotRow({ slot_id: 6, is_active: false }));
      await rejects(moveBooking(PIC, 9, 6), 409, /not open/);

      prismaMock.slot.findFirst.mockResolvedValue(slotRow({ slot_id: 6 }, { is_blocked: true }));
      txOver({ slot_booking: { findMany: jest.fn().mockResolvedValue([{ fk_pilot_user_id: 50, status: 'PENDING' }]) } });
      await rejects(moveBooking(PIC, 9, 6), 409, /already taken/);
    });

    it('moves a pending request to another open slot', async () => {
      const far = new Date(Date.now() + 4 * 86_400_000).getUTCDay();
      prismaMock.slot_booking.findFirst.mockResolvedValue(pending([far]));
      prismaMock.slot.findFirst.mockResolvedValue(slotRow({ slot_id: 6, start_time: '14:00', end_time: '22:00' }));
      const update = jest.fn();
      txOver({
        slot_booking: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue({ status: 'PENDING' }),
          update,
        },
      });
      await moveBooking(PIC, 9, 6);
      expect(update).toHaveBeenCalledWith({ where: { booking_id: 9 }, data: expect.objectContaining({ fk_slot_id: 6 }) });
    });
  });
});

// ───────────────────────── Direct assignment ─────────────────────────

describe('assigning a pilot', () => {
  const pilot = (id: number, name: string, over: Record<string, unknown> = {}) => ({
    user_id: id, first_name: name, last_name: 'P', username: name.toLowerCase(), user_role: 'PIC', email: `${name}@x.com`, users_profile: null, ...over,
  });

  beforeEach(() => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow());
    prismaMock.public_users.findFirst.mockResolvedValue({ user_id: 2 });
    prismaMock.public_users.findMany.mockResolvedValue([pilot(2, 'Pia')]);
  });

  it('is limited to managers', async () => {
    await rejects(assignPilot(PIC, 5, 2), 403);
    await rejects(getSlotCandidates(PIC, 5), 403);
    await rejects(unassignPilot(PIC, 5), 403);
    await rejects(getDayPreview(PIC, day(1)), 403);
    await rejects(getMerits(PIC), 403);
  });

  it('refuses a pilot from another company or an inactive one', async () => {
    prismaMock.public_users.findFirst.mockResolvedValue(null);
    await rejects(assignPilot(OPM, 5, 2), 404, /Pilot not found/);
    expect(prismaMock.public_users.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { user_id: 2, fk_owner_id: 7, user_active: 'Y' } }));
  });

  it('refuses a pilot outside the pilot groups the slot group is offered to', async () => {
    prismaMock.slot_group_pilot_group.findMany.mockResolvedValue([{ fk_slot_group_id: 3, fk_pilot_group_id: 10 }]);
    prismaMock.pilot_group_member.findMany.mockResolvedValue([{ fk_user_id: 99 }]); // members of group 10
    await rejects(assignPilot(OPM, 5, 2), 400, /not in the pilot groups/);
  });

  it('refuses a pilot who already has an overlapping assignment', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([
      { fk_slot_id: 77, fk_pilot_user_id: 2, slot: { slot_date: d(day(2)), start_time: '08:00', end_time: '09:00', slot_group: { name: 'Group B' } } },
    ]);
    const e = await rejects(assignPilot(OPM, 5, 2), 409, /Pia P is already assigned/);
    expect(e.extra?.collision).toMatch(/Group B/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a slot that already has a pilot, and a past or closed slot', async () => {
    txOver({ slot_booking: { findFirst: jest.fn().mockResolvedValue({ booking_id: 1 }) } });
    await rejects(assignPilot(OPM, 5, 2), 409, /already assigned/);

    prismaMock.slot.findFirst.mockResolvedValue(slotRow({ is_active: false }));
    await rejects(assignPilot(OPM, 5, 2), 409, /not open/);
    prismaMock.slot.findFirst.mockResolvedValue(slotRow({ slot_date: d('2020-01-01') }));
    await rejects(assignPilot(OPM, 5, 2), 409, /past/);
  });

  it('creates an approved booking for a pilot who had not asked, and declines the other requests', async () => {
    const create = jest.fn().mockResolvedValue({ booking_id: 40 });
    const updateMany = jest.fn();
    txOver({
      slot_booking: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null), // nobody approved, pilot has no request
        create,
        findMany: jest.fn().mockResolvedValue([{ booking_id: 41, fk_pilot_user_id: 3 }]),
        updateMany,
      },
    });
    prismaMock.public_users.findUnique.mockResolvedValue({ user_id: 2, email: 'pia@x.com' });

    await expect(assignPilot(OPM, 5, 2)).resolves.toEqual({ bookingId: 40 });
    expect(create.mock.calls[0][0].data).toMatchObject({ fk_slot_id: 5, fk_slot_group_id: 3, fk_pilot_user_id: 2, status: 'APPROVED', decided_by: 1 });
    expect(updateMany.mock.calls[0][0]).toMatchObject({ where: { booking_id: { in: [41] } }, data: { status: 'REJECTED' } });
  });

  it('approves the pilot’s existing request instead of creating a second one', async () => {
    const update = jest.fn().mockResolvedValue({ booking_id: 12 });
    const create = jest.fn();
    txOver({
      slot_booking: {
        findFirst: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ booking_id: 12 }),
        update,
        create,
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    await assignPilot(OPM, 5, 2);
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ where: { booking_id: 12 }, data: expect.objectContaining({ status: 'APPROVED' }) });
  });

  it('turns a database uniqueness error from a simultaneous assignment into 409', async () => {
    prismaMock.$transaction.mockRejectedValue({ code: 'P2002' });
    await rejects(assignPilot(OPM, 5, 2), 409, /already assigned/);
  });

  it('unassigns the approved pilot', async () => {
    prismaMock.slot_booking.findFirst.mockResolvedValue({ booking_id: 40, fk_pilot_user_id: 2 });
    prismaMock.slot_booking.update.mockResolvedValue({});
    await unassignPilot(OPM, 5);
    expect(prismaMock.slot_booking.update).toHaveBeenCalledWith({
      where: { booking_id: 40 },
      data: expect.objectContaining({ status: 'REJECTED', decision_note: 'Unassigned by OPM' }),
    });
    prismaMock.slot_booking.findFirst.mockResolvedValue(null);
    await rejects(unassignPilot(OPM, 5), 404);
  });

  describe('candidates dropdown', () => {
    const setupPool = () => {
      prismaMock.pilot_group.findMany.mockResolvedValue([
        { pilot_group_id: 1, name: 'Experts', is_expert: true },
        { pilot_group_id: 2, name: 'Newbies', is_expert: false },
      ]);
      prismaMock.pilot_group_member.findMany.mockResolvedValue([
        { fk_pilot_group_id: 1, fk_user_id: 11 },
        { fk_pilot_group_id: 2, fk_user_id: 12 },
      ]);
      prismaMock.public_users.findMany.mockResolvedValue([
        pilot(10, 'Zed'), // requested the slot
        pilot(11, 'Eve'), // expert
        pilot(12, 'Nia'), // newbie
        pilot(13, 'Cal'), // collides
      ]);
      prismaMock.pilot_mission.groupBy.mockResolvedValue([]);
    };

    it('lists requested pilots first and pilots with a collision last', async () => {
      setupPool();
      prismaMock.slot_booking.findMany.mockImplementation(async (args: any) => {
        if (args.where?.fk_slot_id === 5) return [{ fk_pilot_user_id: 10, status: 'PENDING' }]; // live requests on the slot
        if (args.where?.status === 'APPROVED') {
          return [{ fk_slot_id: 77, fk_pilot_user_id: 13, slot: { slot_date: d(day(2)), start_time: '06:00', end_time: '10:00', slot_group: { name: 'Other' } } }];
        }
        return []; // availability requests for the merit score
      });
      const res = await getSlotCandidates(OPM, 5);
      expect(res.candidates.map((c) => c.name)).toEqual(['Zed P', 'Eve P', 'Nia P', 'Cal P']);
      expect(res.candidates[0].requested).toBe(true);
      expect(res.candidates[3].collision).toMatch(/Other/);
      expect(res.candidates.find((c) => c.userId === 11)).toMatchObject({ expert: true, groups: [{ name: 'Experts', expert: true }] });
    });

    it('puts experts first when the weather is tough', async () => {
      setupPool();
      getWeatherForSlots.mockResolvedValue({ weather: { 5: { level: 'tough' } }, note: null });
      prismaMock.slot_booking.findMany.mockResolvedValue([]);
      // Nia flies more than Eve, which would normally rank her higher.
      prismaMock.pilot_mission.groupBy.mockResolvedValue([{ fk_pilot_user_id: 12, _sum: { flight_duration: 600 } }]);
      const res = await getSlotCandidates(OPM, 5);
      expect(res.weather?.level).toBe('tough');
      const order = res.candidates.map((c) => c.userId);
      expect(order.indexOf(11)).toBeLessThan(order.indexOf(12));
    });

    it('limits the list to the offered pilot groups', async () => {
      setupPool();
      prismaMock.slot_group_pilot_group.findMany.mockResolvedValue([{ fk_slot_group_id: 3, fk_pilot_group_id: 1 }]);
      prismaMock.pilot_group_member.findMany.mockImplementation(async (args: any) =>
        args.where?.fk_pilot_group_id?.in?.length === 1 ? [{ fk_user_id: 11 }] : [{ fk_pilot_group_id: 1, fk_user_id: 11 }, { fk_pilot_group_id: 2, fk_user_id: 12 }],
      );
      const res = await getSlotCandidates(OPM, 5);
      expect(res.candidates.map((c) => c.userId)).toEqual([11]);
    });
  });
});

// ───────────────────────── Day preview ─────────────────────────

describe('day preview', () => {
  it('lists the slots of a day with client and pilot, counting unassigned ones', async () => {
    prismaMock.slot.findMany.mockResolvedValue([
      { slot_id: 1, start_time: '06:00', end_time: '14:00', slot_group: { slot_group_id: 3, name: 'G1', fk_client_id: 4 } },
      { slot_id: 2, start_time: '14:00', end_time: '22:00', slot_group: { slot_group_id: 3, name: 'G1', fk_client_id: 4 } },
      { slot_id: 3, start_time: '14:00', end_time: '22:00', slot_group: { slot_group_id: 8, name: 'G2', fk_client_id: null } },
    ]);
    prismaMock.slot_booking.findMany.mockResolvedValue([
      { fk_slot_id: 1, fk_pilot_user_id: 2, status: 'APPROVED' },
      { fk_slot_id: 2, fk_pilot_user_id: 5, status: 'PENDING' },
      { fk_slot_id: 2, fk_pilot_user_id: 6, status: 'PENDING' },
    ]);
    prismaMock.client.findMany.mockResolvedValue([{ client_id: 4, client_name: 'Acme' }]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2, first_name: 'Pia', last_name: 'Pilot', username: 'pia' }]);
    getWeatherForSlots.mockResolvedValue({ weather: { 2: { level: 'tough' } }, note: null });

    const res = await getDayPreview(OPM, day(1));

    expect(res).toMatchObject({ total: 3, assigned: 1, unassigned: 2 });
    expect(res.rows[0]).toMatchObject({ clientName: 'Acme', pilotName: 'Pia Pilot', groupName: 'G1' });
    expect(res.rows[1]).toMatchObject({ pilotId: null, pending: 2, weather: { level: 'tough' } });
    expect(res.rows[2]).toMatchObject({ clientName: null, pilotId: null, pending: 0 });
    // Only this company's active slots of that date are read.
    expect(prismaMock.slot.findMany.mock.calls[0][0].where).toMatchObject({ is_active: true, slot_group: { fk_owner_id: 7 } });
  });

  it('is empty for a day without slots and says when no forecast exists', async () => {
    prismaMock.slot.findMany.mockResolvedValue([]);
    expect(await getDayPreview(OPM, day(1))).toMatchObject({ total: 0, assigned: 0, unassigned: 0 });
    expect((await getDayPreview(OPM, day(30))).weatherNote).toBe('out_of_range');
  });

  it('rejects an invalid date', async () => {
    await rejects(getDayPreview(OPM, '2026-13-45'), 400);
    await rejects(getDayPreview(OPM, 'tomorrow'), 400);
  });
});

// ───────────────────────── Merits & hours ─────────────────────────

describe('pilot merits', () => {
  const req = (pilotId: number, date: string, status = 'PENDING') => ({ fk_pilot_user_id: pilotId, status, slot: { slot_date: d(date) } });
  // 2026-06-06 is a Saturday, 2026-06-08 a Monday.
  beforeEach(() => {
    prismaMock.public_users.findMany.mockResolvedValue([
      { user_id: 2, first_name: 'Pia', last_name: 'P', username: 'pia', user_role: 'PIC', email: 'p@x.com', users_profile: { profile_picture: 'avatars/2.png' } },
      { user_id: 3, first_name: 'Max', last_name: 'M', username: 'max', user_role: 'PIC', email: 'm@x.com', users_profile: null },
    ]);
    prismaMock.slot_booking.findMany.mockResolvedValue([
      req(2, '2026-06-06', 'APPROVED'), req(2, '2026-06-07'), req(2, '2026-06-08'),
      req(3, '2026-06-08'), req(3, '2026-06-09'),
    ]);
    prismaMock.pilot_mission.groupBy.mockImplementation(async (args: any) =>
      args.where.actual_start ? [{ fk_pilot_user_id: 3, _sum: { flight_duration: 90 } }] : [{ fk_pilot_user_id: 3, _sum: { flight_duration: 600 } }, { fk_pilot_user_id: 2, _sum: { flight_duration: 60 } }],
    );
  });

  it('counts hours, availability and weekend availability, and ranks by score', async () => {
    const { rows, weights } = await getMerits(OPM);
    expect(weights.weekend).toBeGreaterThan(weights.availability);
    const pia = rows.find((r) => r.userId === 2)!;
    const max = rows.find((r) => r.userId === 3)!;
    expect(pia).toMatchObject({ requests90: 3, weekendRequests90: 2, approved90: 1, hours90: 0, hoursTotal: 1, avatarUrl: 'https://s3.example/avatars/2.png' });
    expect(max).toMatchObject({ requests90: 2, weekendRequests90: 0, hours90: 1.5, hoursTotal: 10 });
    // Pia: 0.4*1 + 0.3*1 + 0 = 70; Max: 0 + 0.3*(2/3) + 0.3*1 = 50
    expect(pia.score).toBe(70);
    expect(max.score).toBe(50);
    expect(rows.map((r) => r.userId)).toEqual([2, 3]);
    expect(rows[0].rank).toBe(1);
  });

  it('only reads this company’s pilots', async () => {
    await getMerits(OPM);
    expect(prismaMock.public_users.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 7, user_active: 'Y' });
    expect(prismaMock.pilot_mission.groupBy.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 7 });
  });

  it('gives a pilot their own hours and rank', async () => {
    const mine = await getMyStats(PIC);
    expect(mine).toMatchObject({ hours90: 0, hoursTotal: 1, rank: 1, pilots: 2, score: 70 });
  });
});

// ───────────────────────── Scheduled publishing: notices & publish now ─────────────────────────

describe('scheduled group opening', () => {
  const flushAll = async () => { await flush(); await flush(); };

  it('notifies pilots once when a scheduled group opens', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([{ slot_group_id: 3, fk_owner_id: 7, name: 'Week 9' }]);
    prismaMock.slot_group.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 2, email: 'p@x.com' }, { user_id: 3, email: 'q@x.com' }]);

    expect(await sendPublishNotifications()).toBe(1);
    await flushAll();
    expect(prismaMock.slot_group.updateMany.mock.calls[0][0]).toMatchObject({ where: { slot_group_id: 3, published_notified_at: null } });
    expect(prismaMock.public_users.findMany.mock.calls[0][0].where).toMatchObject({ fk_owner_id: 7, user_active: 'Y', user_role: { in: ['PIC'] } });
    const rows = prismaMock.notification.createMany.mock.calls[0][0].data;
    expect(rows.map((r: any) => r.fk_user_id)).toEqual([2, 3]);
    expect(rows[0].notification_message).toContain('Week 9');
  });

  it('notifies only the offered pilot groups’ members', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([{ slot_group_id: 3, fk_owner_id: 7, name: 'Experts only' }]);
    prismaMock.slot_group.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.slot_group_pilot_group.findMany.mockResolvedValue([{ fk_slot_group_id: 3, fk_pilot_group_id: 1 }]);
    prismaMock.pilot_group_member.findMany.mockResolvedValue([{ fk_user_id: 11 }]);
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 11, email: 'e@x.com' }]);

    await sendPublishNotifications();
    expect(prismaMock.public_users.findMany.mock.calls[0][0].where).toMatchObject({ user_id: { in: [11] } });
  });

  it('skips a group another run already announced', async () => {
    prismaMock.slot_group.findMany.mockResolvedValue([{ slot_group_id: 3, fk_owner_id: 7, name: 'Week 9' }]);
    prismaMock.slot_group.updateMany.mockResolvedValue({ count: 0 });
    expect(await sendPublishNotifications()).toBe(0);
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it('lets the OPM publish a scheduled group now, but not an already open one', async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue({ slot_group_id: 3, name: 'Week 9', publish_at: new Date(Date.now() + 86_400_000) });
    prismaMock.slot_group.update.mockResolvedValue({});
    await publishGroupNow(OPM, 3);
    expect(prismaMock.slot_group.update.mock.calls[0][0]).toMatchObject({ where: { slot_group_id: 3 }, data: { publish_at: expect.any(Date) } });

    prismaMock.slot_group.findFirst.mockResolvedValue({ slot_group_id: 3, name: 'Week 9', publish_at: null });
    await rejects(publishGroupNow(OPM, 3), 409, /already published/);
    await rejects(publishGroupNow(PIC, 3), 403);
  });
});

describe('monthly flight limits', () => {
  const { getPilotFlights, saveFlightLimits } = jest.requireActual('@/backend/services/slot-booking/flight-limits-service');

  it('is grey with the hours flown when no limit is assigned', async () => {
    prismaMock.slot_settings.findUnique.mockResolvedValue({ cycle_start_day: 10 });
    prismaMock.pilot_mission.groupBy.mockResolvedValue([{ fk_pilot_user_id: 5, _sum: { flight_duration: 7200 } }]);
    const flights = await getPilotFlights(7, [5], '2026-11-13');
    expect(flights.get(5)).toMatchObject({ cycleHours: 120, limitHours: null, level: 'none', cycleStart: '2026-11-10', cycleEnd: '2026-12-10' });
  });

  it('turns yellow at 90% and red at 100% of the limit', async () => {
    prismaMock.pilot_flight_limit.findMany.mockResolvedValue([
      { fk_user_id: 1, monthly_hours: 40 },
      { fk_user_id: 2, monthly_hours: 40 },
      { fk_user_id: 3, monthly_hours: 40 },
    ]);
    prismaMock.pilot_mission.groupBy.mockResolvedValue([
      { fk_pilot_user_id: 1, _sum: { flight_duration: 30 * 60 } },
      { fk_pilot_user_id: 2, _sum: { flight_duration: 36 * 60 } },
      { fk_pilot_user_id: 3, _sum: { flight_duration: 40 * 60 } },
    ]);
    const flights = await getPilotFlights(7, [1, 2, 3], '2026-11-13');
    expect([1, 2, 3].map((id) => flights.get(id).level)).toEqual(['ok', 'warn', 'over']);
  });

  it('counts only missions inside the current cycle', async () => {
    prismaMock.slot_settings.findUnique.mockResolvedValue({ cycle_start_day: 10 });
    await getPilotFlights(7, [5], '2026-11-05');
    const cycleCall = prismaMock.pilot_mission.groupBy.mock.calls.map((c: any) => c[0]).find((a: any) => a.where.actual_start);
    expect(cycleCall.where.actual_start.gte.toISOString()).toBe('2026-10-10T00:00:00.000Z');
    expect(cycleCall.where.actual_start.lt.toISOString()).toBe('2026-11-10T00:00:00.000Z');
  });

  it('saves limits and removes a limit when hours is null', async () => {
    prismaMock.public_users.findMany.mockResolvedValue([{ user_id: 1 }, { user_id: 2 }]);
    prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    await saveFlightLimits(7, [{ userId: 1, hours: 45 }, { userId: 2, hours: null }, { userId: 99, hours: 10 }]);
    expect(prismaMock.pilot_flight_limit.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.pilot_flight_limit.upsert.mock.calls[0][0].create).toMatchObject({ fk_user_id: 1, monthly_hours: 45 });
    expect(prismaMock.pilot_flight_limit.deleteMany).toHaveBeenCalledWith({ where: { fk_owner_id: 7, fk_user_id: 2 } });
  });
});
