/**
 * Slot Booking: shared helpers + the service's business rules (role guards, duplicate-slot
 * conflicts, blocked slots, PDF upload limits). Prisma / S3 / mail are mocked.
 *
 * Run:  npm test -- slot-booking
 */

const prismaMock: Record<string, any> = {
  slot: { findMany: jest.fn(), findFirst: jest.fn() },
  slot_group: { findFirst: jest.fn(), delete: jest.fn() },
  slot_booking: { findMany: jest.fn(), findFirst: jest.fn() },
  public_users: { findMany: jest.fn(), findUnique: jest.fn() },
  notification: { createMany: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({
  getFileBufferFromS3: jest.fn(),
  getPresignedDownloadUrl: jest.fn(),
  getPresignedUploadUrl: jest.fn().mockResolvedValue('https://s3.example/upload'),
}));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn().mockResolvedValue(true) }));
jest.mock('@/backend/services/email/email-limit-service', () => ({
  isDailyEmailLimitReached: jest.fn().mockResolvedValue(false),
  incrementDailyEmailCount: jest.fn(),
}));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));

import {
  approveBooking,
  canBookSlots,
  canManageSlots,
  createGroup,
  createPdfUploadUrl,
  deleteGroup,
  editSlot,
  requestBooking,
  SlotBookingError,
} from '@/backend/services/slot-booking/slot-booking-service';
import type { NewSlotGroupInput } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import {
  addDaysIso,
  groupDates,
  nextApprovalDay,
  timeBlocks,
  todayIso,
  weekdayOf,
} from '@/lib/slot-booking-utils';

const user = (role: string, userId = 1): SessionUser => ({ userId, ownerId: 7, role, fullname: 'Test User', email: 't@example.com' }) as unknown as SessionUser;
const OPM = user('OPM');
const PIC = user('PIC', 2);

const tomorrow = addDaysIso(todayIso(), 1);
const validInput = (over: Partial<NewSlotGroupInput> = {}): NewSlotGroupInput => ({
  name: 'Week 1',
  mode: 'SHIFT',
  hourStart: 6,
  hourEnd: 22,
  rangeMode: 'DAY',
  startDate: tomorrow,
  blocked: false,
  approvalDays: [1],
  slots: [{ date: tomorrow, start: '06:00', end: '14:00' }],
  resolution: 'none',
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('slot-booking helpers', () => {
  it('builds the date range for a day, a week and two weeks', () => {
    expect(groupDates('2026-03-30', 'DAY')).toEqual(['2026-03-30']);
    expect(groupDates('2026-03-30', 'WEEK')).toHaveLength(7);
    const two = groupDates('2026-03-30', 'TWO_WEEKS');
    expect(two).toHaveLength(14);
    // crosses a month boundary without timezone drift
    expect(two[2]).toBe('2026-04-01');
    expect(two[13]).toBe('2026-04-12');
  });

  it('generates hourly blocks within the window and the three shift blocks', () => {
    expect(timeBlocks('HOURLY', 8, 11)).toEqual([['08:00', '09:00'], ['09:00', '10:00'], ['10:00', '11:00']]);
    expect(timeBlocks('HOURLY', 22, 24)[1]).toEqual(['23:00', '00:00']);
    expect(timeBlocks('SHIFT', 0, 0)).toEqual([['06:00', '14:00'], ['14:00', '22:00'], ['22:00', '06:00']]);
  });

  it('finds the next approval weekday, saying "Today" when it is today', () => {
    const monday = new Date('2026-03-30T10:00:00Z');
    expect(weekdayOf('2026-03-30')).toBe(1);
    expect(nextApprovalDay([1, 4], monday)).toMatchObject({ date: '2026-03-30', label: 'Today' });
    expect(nextApprovalDay([4], monday)).toMatchObject({ date: '2026-04-02', label: 'Thursday' });
    expect(nextApprovalDay([], monday)).toBeNull();
  });
});

describe('roles', () => {
  it('lets OPM / ADMIN / SUPERADMIN manage and only PIC book', () => {
    for (const r of ['OPM', 'ADMIN', 'SUPERADMIN']) expect(canManageSlots(user(r))).toBe(true);
    for (const r of ['PIC', 'AM', 'CLIENT']) expect(canManageSlots(user(r))).toBe(false);
    expect(canBookSlots(PIC)).toBe(true);
    expect(canBookSlots(OPM)).toBe(false);
  });

  it('rejects management actions from a pilot and booking from an OPM', async () => {
    await expect(createGroup(PIC, validInput())).rejects.toMatchObject({ status: 403 });
    await expect(approveBooking(PIC, 1)).rejects.toMatchObject({ status: 403 });
    await expect(editSlot(PIC, 1, { start: '06:00', end: '07:00', active: true }, 'x')).rejects.toMatchObject({ status: 403 });
    await expect(requestBooking(OPM, 1)).rejects.toMatchObject({ status: 403 });
  });
});

describe('createGroup', () => {
  it('rejects slots that do not match the chosen parameters', async () => {
    await expect(createGroup(OPM, validInput({ slots: [{ date: tomorrow, start: '09:00', end: '10:00' }] }))).rejects.toThrow('do not match');
    await expect(createGroup(OPM, validInput({ slots: [{ date: addDaysIso(tomorrow, 3), start: '06:00', end: '14:00' }] }))).rejects.toThrow('do not match');
  });

  it('rejects a past start date, no approval day, and no active slots', async () => {
    await expect(createGroup(OPM, validInput({ startDate: '2020-01-01' }))).rejects.toThrow('past');
    await expect(createGroup(OPM, validInput({ approvalDays: [] }))).rejects.toThrow('approval day');
    await expect(createGroup(OPM, validInput({ slots: [] }))).rejects.toThrow('Activate at least one slot');
  });

  it('answers 409 with the conflicting dates when slots already exist and no resolution was chosen', async () => {
    prismaMock.slot.findMany.mockResolvedValue([{ slot_date: new Date(`${tomorrow}T00:00:00.000Z`) }]);
    const err = await createGroup(OPM, validInput()).catch((e) => e);
    expect(err).toBeInstanceOf(SlotBookingError);
    expect(err.status).toBe(409);
    expect(err.extra).toEqual({ conflicts: [tomorrow] });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe('requestBooking', () => {
  const slotRow = (blocked: boolean, over: Record<string, unknown> = {}) => ({
    slot_id: 5,
    fk_slot_group_id: 3,
    slot_date: new Date(`${tomorrow}T00:00:00.000Z`),
    start_time: '06:00',
    end_time: '14:00',
    is_active: true,
    slot_group: { name: 'G', is_blocked: blocked, approval_days: [1] },
    ...over,
  });
  const withLiveBookings = (rows: Array<{ fk_pilot_user_id: number; status: string }>) =>
    prismaMock.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb({
        $queryRaw: jest.fn(),
        slot_booking: { findMany: jest.fn().mockResolvedValue(rows), create: jest.fn().mockResolvedValue({ booking_id: 11 }) },
      }),
    );

  it('refuses a blocked slot that another pilot already holds', async () => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow(true));
    withLiveBookings([{ fk_pilot_user_id: 99, status: 'PENDING' }]);
    await expect(requestBooking(PIC, 5)).rejects.toMatchObject({ status: 409, message: 'This slot is already taken' });
  });

  it('lets several pilots request an unblocked slot, but not twice by the same pilot', async () => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow(false));
    prismaMock.public_users.findMany.mockResolvedValue([]);
    prismaMock.public_users.findUnique.mockResolvedValue(null);
    withLiveBookings([{ fk_pilot_user_id: 99, status: 'PENDING' }]);
    await expect(requestBooking(PIC, 5)).resolves.toHaveProperty('reviewDay');

    withLiveBookings([{ fk_pilot_user_id: PIC.userId, status: 'PENDING' }]);
    await expect(requestBooking(PIC, 5)).rejects.toMatchObject({ message: 'You already requested this slot' });
  });

  it('refuses a disabled slot and a slot in the past', async () => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow(false, { is_active: false }));
    await expect(requestBooking(PIC, 5)).rejects.toMatchObject({ message: 'This slot is not open' });
    prismaMock.slot.findFirst.mockResolvedValue(slotRow(false, { slot_date: new Date('2020-01-01T00:00:00.000Z') }));
    await expect(requestBooking(PIC, 5)).rejects.toMatchObject({ message: 'This slot is in the past' });
  });
});

describe('approveBooking / editSlot / PDF', () => {
  it("refuses an attachment key outside the OPM's own upload folder", async () => {
    await expect(approveBooking(OPM, 1, { fileKey: 'slot-booking/7/999/evil.pdf', fileName: 'x.pdf' })).rejects.toMatchObject({ status: 403 });
    await expect(approveBooking(OPM, 1, { fileKey: 'slot-booking/7/1/../../etc.pdf', fileName: 'x.pdf' })).rejects.toMatchObject({ status: 403 });
  });

  it('requires a reason and valid times to edit a slot', async () => {
    await expect(editSlot(OPM, 1, { start: '06:00', end: '07:00', active: true }, '  ')).rejects.toThrow('reason');
    await expect(editSlot(OPM, 1, { start: '25:00', end: '07:00', active: true }, 'why')).rejects.toThrow('Invalid time');
  });

  it('only issues upload links for PDFs up to 10 MB', async () => {
    await expect(createPdfUploadUrl(OPM, { file_name: 'a.png', content_type: 'image/png', file_size: 100 })).rejects.toThrow('Only PDF');
    await expect(createPdfUploadUrl(OPM, { file_name: 'a.pdf', content_type: 'application/pdf', file_size: 11 * 1024 * 1024 })).rejects.toMatchObject({ status: 413 });
    const ok = await createPdfUploadUrl(OPM, { file_name: 'my clearance (1).pdf', content_type: 'application/pdf', file_size: 1000 });
    expect(ok.file_key).toMatch(/^slot-booking\/7\/1\/\d+_my_clearance_1_\.pdf$/);
  });
});

describe('group names', () => {
  it('rejects a name already used in the company, ignoring case and spaces', async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue({ slot_group_id: 9 });
    const err = await createGroup(OPM, validInput({ name: '  week 1 ' })).catch((e) => e);
    expect(err).toBeInstanceOf(SlotBookingError);
    expect(err).toMatchObject({ status: 409, message: 'A slot group with this name already exists' });
    expect(prismaMock.slot_group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fk_owner_id: 7, name: { equals: 'week 1', mode: 'insensitive' } } }),
    );
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('gives the same answer when the unique index stops a simultaneous publish', async () => {
    prismaMock.slot_group.findFirst.mockResolvedValue(null);
    prismaMock.slot.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockRejectedValue({ code: 'P2002' });
    await expect(createGroup(OPM, validInput())).rejects.toMatchObject({ status: 409, message: 'A slot group with this name already exists' });
  });
});

describe('deleteGroup', () => {
  const slotOf = (start: string, end: string) => ({ slot_date: new Date(`${tomorrow}T00:00:00.000Z`), start_time: start, end_time: end });
  const flush = () => new Promise((r) => setTimeout(r, 0)); // notifications are fire-and-forget

  beforeEach(() => {
    prismaMock.slot_group.findFirst.mockResolvedValue({ slot_group_id: 3, name: 'Week 1', fk_owner_id: 7 });
    prismaMock.slot_group.delete.mockResolvedValue({});
    prismaMock.public_users.findUnique.mockImplementation(async ({ where }: { where: { user_id: number } }) => ({
      user_id: where.user_id,
      email: `p${where.user_id}@example.com`,
    }));
    prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
  });

  it('sends each pilot with live requests one high-priority warning listing the cancelled slots', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([
      { fk_pilot_user_id: 2, status: 'PENDING', slot: slotOf('06:00', '14:00') },
      { fk_pilot_user_id: 2, status: 'APPROVED', slot: slotOf('14:00', '22:00') },
      { fk_pilot_user_id: 5, status: 'PENDING', slot: slotOf('06:00', '14:00') },
    ]);
    await deleteGroup(OPM, 3);
    await flush();

    expect(prismaMock.slot_group.delete).toHaveBeenCalledWith({ where: { slot_group_id: 3 } });
    expect(prismaMock.notification.createMany).toHaveBeenCalledTimes(2);
    const rows = prismaMock.notification.createMany.mock.calls.map((c: any[]) => c[0].data[0]);
    const pilot2 = rows.find((r: any) => r.fk_user_id === 2);
    expect(pilot2).toMatchObject({
      notification_type: 'SLOT_WARNING',
      priority: 'high',
      notification_title: 'Slot group deleted',
      action_url: '/operations/slot-booking',
      is_read: false,
    });
    expect(pilot2.notification_message).toContain('“Week 1” was deleted');
    expect(pilot2.notification_message).toContain('Your 2 slot requests');
    expect(pilot2.notification_message).toContain('(approved)');
    const pilot5 = rows.find((r: any) => r.fk_user_id === 5);
    expect(pilot5.notification_message).toContain('Your 1 slot request in it was cancelled');
  });

  it('does not warn anyone when nobody had a live request in the group', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([]);
    await deleteGroup(OPM, 3);
    await flush();
    expect(prismaMock.slot_group.delete).toHaveBeenCalled();
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });

  it('is limited to the OPM', async () => {
    await expect(deleteGroup(PIC, 3)).rejects.toMatchObject({ status: 403 });
    expect(prismaMock.slot_group.delete).not.toHaveBeenCalled();
  });
});
