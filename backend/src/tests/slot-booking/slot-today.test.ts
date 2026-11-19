/**
 * Today tab: slot state rules, mission progress mapping, site-zone slot instants, which approved slots count as
 * "today", and who may link missions to a slot. Prisma and the weather lookup are mocked.
 *
 * Run:  npm test -- slot-today
 */

const prismaMock: Record<string, any> = {
  slot: { findFirst: jest.fn(), findMany: jest.fn() },
  slot_booking: { findFirst: jest.fn(), findMany: jest.fn() },
  slot_mission: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  pilot_mission: { findMany: jest.fn(), count: jest.fn() },
  client: { findMany: jest.fn() },
  tool: { findMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({ getFileBufferFromS3: jest.fn(), getPresignedDownloadUrl: jest.fn(), getPresignedUploadUrl: jest.fn() }));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn() }));
jest.mock('@/backend/services/email/email-limit-service', () => ({ isDailyEmailLimitReached: jest.fn(), incrementDailyEmailCount: jest.fn() }));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));
jest.mock('@/backend/services/slot-booking/slot-weather-service', () => ({ getWeatherForSlots: jest.fn().mockResolvedValue({ weather: {}, note: null }) }));

import { getSlotMissionCandidates, getTodayBoard, linkSlotMissions, unlinkSlotMission } from '@/backend/services/slot-booking/slot-today-service';
import { logEvent } from '@/backend/services/auditLog/audit-log';
import type { SessionUser } from '@/lib/auth/server-session';
import { missionProgress, slotElapsed, slotPhase, todaySlotState } from '@/lib/slot-booking-logic';
import { zonedSlotInterval } from '@/lib/slot-booking-utils';

const PILOT = { userId: 11, ownerId: 7, role: 'PIC', fullname: 'Pia Pilot', email: 'p@example.com' } as unknown as SessionUser;
const OTHER_PILOT = { ...PILOT, userId: 12 } as unknown as SessionUser;
const OPM = { userId: 1, ownerId: 7, role: 'OPM', fullname: 'Opm', email: 'o@example.com' } as unknown as SessionUser;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mission progress', () => {
  it('follows the Daily Board status name first, then the board column id, then the flight times', () => {
    expect(missionProgress({ statusName: 'IN_PROGRESS', statusId: 1 })).toBe('in_progress');
    expect(missionProgress({ statusName: 'completed' })).toBe('completed');
    expect(missionProgress({ statusName: 'ABORTED' })).toBe('aborted');
    expect(missionProgress({ statusId: 2 })).toBe('in_progress');
    expect(missionProgress({ statusId: 3 })).toBe('completed');
    expect(missionProgress({ statusId: 5 })).toBe('aborted');
    expect(missionProgress({ statusId: 99, actualStart: '2026-11-17T08:00:00Z' })).toBe('in_progress');
    expect(missionProgress({ actualStart: '2026-11-17T08:00:00Z', actualEnd: '2026-11-17T09:00:00Z' })).toBe('completed');
    expect(missionProgress({})).toBe('planned');
  });
});

describe('slot state', () => {
  it('is red without a mission, whatever the time', () => {
    expect(todaySlotState('upcoming', [])).toBe('no_mission');
    expect(todaySlotState('live', [])).toBe('no_mission');
    expect(todaySlotState('live', ['aborted'])).toBe('no_mission');
  });

  it('is red once the slot runs and nothing was started on the Daily Board', () => {
    expect(todaySlotState('upcoming', ['planned'])).toBe('waiting');
    expect(todaySlotState('live', ['planned'])).toBe('no_progress');
    expect(todaySlotState('ended', ['planned'])).toBe('no_progress');
  });

  it('turns in progress as soon as one mission is started, and completed when all are done', () => {
    expect(todaySlotState('live', ['completed', 'in_progress', 'planned'])).toBe('in_progress');
    expect(todaySlotState('live', ['completed', 'planned'])).toBe('partial');
    expect(todaySlotState('ended', ['completed', 'planned'])).toBe('incomplete');
    expect(todaySlotState('live', ['completed', 'aborted'])).toBe('completed');
    expect(todaySlotState('upcoming', ['completed'])).toBe('completed');
  });

  it('places now before, inside or after the slot and fills the timer', () => {
    expect(slotPhase(5, 10, 20)).toBe('upcoming');
    expect(slotPhase(10, 10, 20)).toBe('live');
    expect(slotPhase(20, 10, 20)).toBe('ended');
    expect(slotElapsed(5, 10, 20)).toBe(0);
    expect(slotElapsed(15, 10, 20)).toBe(0.5);
    expect(slotElapsed(25, 10, 20)).toBe(1);
  });
});

describe('site-zone slot instants', () => {
  it('turns site wall-clock times into real instants, overnight slots ending the next day', () => {
    const kolkata = zonedSlotInterval('2026-11-17', '06:00', '14:00', 'Asia/Kolkata');
    expect(new Date(kolkata.from).toISOString()).toBe('2026-11-17T00:30:00.000Z');
    expect(new Date(kolkata.to).toISOString()).toBe('2026-11-17T08:30:00.000Z');
    const night = zonedSlotInterval('2026-11-17', '22:00', '06:00', 'Europe/Rome');
    expect(new Date(night.from).toISOString()).toBe('2026-11-17T21:00:00.000Z');
    expect(new Date(night.to).toISOString()).toBe('2026-11-18T05:00:00.000Z');
  });
});

const booking = (slotId: number, date: string, start: string, end: string, timezone = 'Europe/Rome') => ({
  booking_id: slotId * 10,
  fk_slot_id: slotId,
  fk_pilot_user_id: PILOT.userId,
  slot: {
    slot_id: slotId,
    slot_date: new Date(`${date}T00:00:00.000Z`),
    start_time: start,
    end_time: end,
    slot_group: { slot_group_id: 3, name: 'Week 47', timezone, fk_client_id: null, fk_tool_id: null },
  },
});

describe('today board', () => {
  it("keeps the site's today slots and last night's overnight slot while it still runs, in time order", async () => {
    const now = new Date('2026-11-17T04:00:00Z'); // 05:00 in Rome
    prismaMock.slot_booking.findMany.mockResolvedValue([
      booking(1, '2026-11-17', '14:00', '22:00'),
      booking(2, '2026-11-16', '22:00', '06:00'), // still running until 06:00
      booking(3, '2026-11-16', '06:00', '14:00'), // yesterday, over
      booking(4, '2026-11-18', '06:00', '14:00'), // tomorrow
      booking(5, '2026-11-17', '06:00', '14:00'),
    ]);
    prismaMock.slot_mission.findMany.mockResolvedValue([]);
    prismaMock.pilot_mission.count.mockResolvedValue(2);

    const board = await getTodayBoard(PILOT, now);

    expect(board.slots.map((s) => s.slotId)).toEqual([2, 5, 1]);
    expect(board.slots[0].endAt).toBe('2026-11-17T05:00:00.000Z');
    expect(board.unlinkedMissions).toBe(2);
  });

  it('attaches linked missions with their live Daily Board progress', async () => {
    const now = new Date('2026-11-17T09:00:00Z');
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(5, '2026-11-17', '06:00', '14:00')]);
    prismaMock.slot_mission.findMany.mockResolvedValue([{ fk_slot_id: 5, fk_pilot_mission_id: 900 }]);
    prismaMock.pilot_mission.findMany.mockResolvedValue([
      { pilot_mission_id: 900, mission_code: 'M-900', status_name: 'IN_PROGRESS', fk_mission_status_id: 2, actual_start: new Date('2026-11-17T08:40:00Z') },
    ]);
    prismaMock.pilot_mission.count.mockResolvedValue(0);

    const board = await getTodayBoard(PILOT, now);

    expect(board.slots[0].missions).toHaveLength(1);
    expect(board.slots[0].missions[0]).toMatchObject({ id: 900, code: 'M-900', progress: 'in_progress' });
  });
});

describe('linking missions', () => {
  const slotRow = {
    slot_id: 5,
    slot_date: new Date('2026-11-17T00:00:00.000Z'),
    start_time: '06:00',
    end_time: '14:00',
    slot_group: { slot_group_id: 3, name: 'Week 47', timezone: 'Europe/Rome', fk_client_id: null, client: null },
  };

  beforeEach(() => {
    prismaMock.slot.findFirst.mockResolvedValue(slotRow);
    prismaMock.slot_booking.findFirst.mockResolvedValue({ fk_pilot_user_id: PILOT.userId });
    prismaMock.slot_mission.findMany.mockResolvedValue([]);
    prismaMock.slot_mission.findFirst = jest.fn().mockResolvedValue(null);
    prismaMock.slot_mission.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.slot_booking.findMany.mockResolvedValue([]);
    prismaMock.pilot_mission.findFirst = jest.fn().mockResolvedValue(null);
    prismaMock.slot.findMany.mockResolvedValue([]);
  });

  it("lets the slot's pilot link their missions of that day and writes the audit log", async () => {
    prismaMock.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 900, mission_code: 'M-900' }]);
    prismaMock.slot_mission.createMany.mockResolvedValue({ count: 1 });

    await expect(linkSlotMissions(PILOT, 5, [900])).resolves.toEqual({ linked: 1, skipped: 0 });
    expect(prismaMock.slot_mission.createMany).toHaveBeenCalledWith({
      data: [{ fk_slot_id: 5, fk_pilot_mission_id: 900, fk_owner_id: 7, linked_by: PILOT.userId }],
      skipDuplicates: true,
    });
    const where = prismaMock.pilot_mission.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ fk_owner_id: 7, fk_pilot_user_id: PILOT.userId, pilot_mission_id: { in: [900] } });
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'slot', entityId: 5 }));
  });

  it('refuses another pilot, but lets the OPM link for the assigned pilot', async () => {
    await expect(linkSlotMissions(OTHER_PILOT, 5, [900])).rejects.toMatchObject({ status: 403 });

    prismaMock.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 900, mission_code: 'M-900' }]);
    prismaMock.slot_mission.createMany.mockResolvedValue({ count: 1 });
    await expect(linkSlotMissions(OPM, 5, [900])).resolves.toEqual({ linked: 1, skipped: 0 });
    expect(prismaMock.pilot_mission.findMany.mock.calls[0][0].where.fk_pilot_user_id).toBe(PILOT.userId);
  });

  it('refuses a slot without an approved pilot, and missions that are not eligible', async () => {
    prismaMock.slot_booking.findFirst.mockResolvedValueOnce(null);
    await expect(linkSlotMissions(PILOT, 5, [900])).rejects.toMatchObject({ status: 409 });

    prismaMock.pilot_mission.findMany.mockResolvedValue([]); // not the pilot's, other day, aborted…
    await expect(linkSlotMissions(PILOT, 5, [900])).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.slot_mission.createMany).not.toHaveBeenCalled();
  });

  it('refuses a mission already linked to another slot', async () => {
    prismaMock.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 900, mission_code: 'M-900' }]);
    prismaMock.slot_mission.findMany.mockResolvedValue([{ fk_slot_id: 6, fk_pilot_mission_id: 900 }]);
    prismaMock.slot.findMany.mockResolvedValue([{ slot_id: 6, start_time: '14:00', end_time: '22:00', slot_group: { name: 'Week 47' } }]);
    prismaMock.slot_booking.findMany.mockResolvedValue([{ fk_slot_id: 6 }]); // slot 6 still has this pilot

    await expect(linkSlotMissions(PILOT, 5, [900])).rejects.toMatchObject({ status: 409, message: expect.stringContaining('14:00–22:00') });
    expect(prismaMock.slot_mission.createMany).not.toHaveBeenCalled();
  });

  it('frees a stale link (its slot lost the pilot) instead of blocking the mission', async () => {
    prismaMock.pilot_mission.findMany.mockResolvedValue([{ pilot_mission_id: 900, mission_code: 'M-900' }]);
    prismaMock.slot_mission.findMany.mockResolvedValue([{ fk_slot_id: 6, fk_pilot_mission_id: 900 }]);
    prismaMock.slot_booking.findMany.mockResolvedValue([]); // nobody approved on slot 6 any more
    prismaMock.slot_mission.createMany.mockResolvedValue({ count: 1 });

    await expect(linkSlotMissions(PILOT, 5, [900])).resolves.toEqual({ linked: 1, skipped: 0 });
    expect(prismaMock.slot_mission.deleteMany).toHaveBeenCalledWith({ where: { fk_pilot_mission_id: { in: [900] }, fk_slot_id: { not: 5 }, fk_owner_id: 7 } });
  });

  it('reports the missions the database skipped in a race, not the number it tried to insert', async () => {
    prismaMock.pilot_mission.findMany.mockResolvedValue([
      { pilot_mission_id: 900, mission_code: 'M-900' },
      { pilot_mission_id: 901, mission_code: 'M-901' },
    ]);
    prismaMock.slot_mission.createMany.mockResolvedValue({ count: 1 }); // 901 was linked elsewhere a moment ago
    prismaMock.slot_mission.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ fk_pilot_mission_id: 900 }]);

    await expect(linkSlotMissions(PILOT, 5, [900, 901])).resolves.toEqual({ linked: 1, skipped: 1 });
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ missionIds: [900] }) }));
  });

  it('lists aborted missions of the day in the picker, last and never as a suggestion, so the pilot sees why one is missing', async () => {
    const at = new Date('2026-11-17T08:00:00Z'); // inside the 06:00–14:00 Rome slot
    prismaMock.pilot_mission.findMany
      .mockResolvedValueOnce([{ pilot_mission_id: 900, mission_code: 'M-900', status_name: 'IN_PROGRESS', scheduled_start: at }])
      .mockResolvedValueOnce([{ pilot_mission_id: 901, mission_code: 'M-901', status_name: 'ABORTED', fk_mission_status_id: 5, scheduled_start: at }]);

    const { missions } = await getSlotMissionCandidates(PILOT, 5);

    expect(missions.map((m) => [m.id, m.progress, m.linkedSlotId])).toEqual([[900, 'in_progress', null], [901, 'aborted', null]]);
    expect(prismaMock.pilot_mission.findMany.mock.calls[1][0].where.AND[0]).toEqual({
      OR: [{ status_name: { in: ['ABORTED', 'CANCELLED'], mode: 'insensitive' } }, { fk_mission_status_id: 5 }],
    });
  });

  it('unlinks, and reports a mission that was not linked', async () => {
    prismaMock.slot_mission.findFirst.mockResolvedValueOnce({ fk_slot_id: 5 });
    await expect(unlinkSlotMission(PILOT, 5, 900)).resolves.toBeUndefined();
    expect(prismaMock.slot_mission.deleteMany).toHaveBeenCalledWith({ where: { fk_slot_id: 5, fk_pilot_mission_id: 900, fk_owner_id: 7 } });
    await expect(unlinkSlotMission(PILOT, 5, 900)).rejects.toMatchObject({ status: 404 });
  });

  it('lets the mission pilot, or the OPM, unlink from a slot that has lost its pilot, but nobody else', async () => {
    prismaMock.slot_mission.findFirst.mockResolvedValue({ fk_slot_id: 5 });
    prismaMock.slot_booking.findFirst.mockResolvedValue(null); // no approved pilot on the slot any more
    prismaMock.pilot_mission.findFirst.mockResolvedValue({ fk_pilot_user_id: PILOT.userId });

    await expect(unlinkSlotMission(PILOT, 5, 900)).resolves.toBeUndefined();
    await expect(unlinkSlotMission(OPM, 5, 900)).resolves.toBeUndefined();
    await expect(unlinkSlotMission(OTHER_PILOT, 5, 900)).rejects.toMatchObject({ status: 403 });
  });
});

describe('missions of a slot whose pilot changed', () => {
  it("shows only the current pilot's own missions on the board", async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(5, '2026-11-17', '06:00', '14:00')]);
    prismaMock.slot_mission.findMany.mockResolvedValue([{ fk_slot_id: 5, fk_pilot_mission_id: 900 }]);
    prismaMock.pilot_mission.findMany.mockResolvedValue([]);
    prismaMock.pilot_mission.count.mockResolvedValue(0);

    await getTodayBoard(PILOT, new Date('2026-11-17T09:00:00Z'));

    const where = prismaMock.pilot_mission.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ pilot_mission_id: { in: [900] }, fk_pilot_user_id: PILOT.userId });
  });

  it('clears the links when the OPM unassigns the pilot, and still unassigns if the cleanup fails', async () => {
    const { unassignPilot } = await import('@/backend/services/slot-booking/slot-assignment-service');
    prismaMock.slot.findFirst.mockResolvedValue({
      slot_id: 5,
      fk_slot_group_id: 3,
      slot_date: new Date('2026-11-17T00:00:00.000Z'),
      start_time: '06:00',
      end_time: '14:00',
      slot_group: { name: 'Week 47', timezone: 'Europe/Rome' },
    });
    prismaMock.slot_booking.findFirst.mockResolvedValue({ booking_id: 50, fk_pilot_user_id: PILOT.userId });
    prismaMock.slot_booking.update = jest.fn().mockResolvedValue({});
    prismaMock.public_users = { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) };
    prismaMock.notification = { createMany: jest.fn() };
    prismaMock.slot_mission.deleteMany.mockResolvedValue({ count: 1 });

    await unassignPilot(OPM, 5);
    expect(prismaMock.slot_mission.deleteMany).toHaveBeenCalledWith({ where: { fk_slot_id: 5 } });

    prismaMock.slot_mission.deleteMany.mockRejectedValueOnce(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(unassignPilot(OPM, 5)).resolves.toBeUndefined();
  });
});
