/**
 * Client portal "Scheduled flights": which approved slots a client sees, what pilot info comes with them, and that
 * nothing of other clients or the slot-booking workflow leaks. Prisma, S3 and the weather lookup are mocked.
 *
 * Run:  npm test -- client-scheduled-flights
 */

const prismaMock: Record<string, any> = {
  slot_booking: { findMany: jest.fn() },
  public_users: { findMany: jest.fn() },
  tool: { findMany: jest.fn() },
  slot_mission: { findMany: jest.fn() },
  pilot_mission: { findMany: jest.fn() },
};
jest.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
jest.mock('@/lib/s3Client', () => ({ getFileBufferFromS3: jest.fn(), getPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3/signed'), getPresignedUploadUrl: jest.fn() }));
jest.mock('../../../../lib/resend/mail', () => ({ sendNotificationEmailWithAttachments: jest.fn() }));
jest.mock('@/backend/services/email/email-limit-service', () => ({ isDailyEmailLimitReached: jest.fn(), incrementDailyEmailCount: jest.fn() }));
jest.mock('@/backend/services/auditLog/audit-log', () => ({ logEvent: jest.fn() }));
jest.mock('@/backend/services/slot-booking/slot-weather-service', () => ({ getWeatherForSlots: jest.fn().mockResolvedValue({ weather: {}, note: null }) }));

import { ClientScheduledFlightsError, getClientScheduledFlights } from '@/backend/services/client/client-scheduled-flights-service';
import { getWeatherForSlots } from '@/backend/services/slot-booking/slot-weather-service';

const CLIENT = 42;
const OWNER = 7;
const DAY = '2026-11-26';

const booking = (slotId: number, pilotId: number, start: string, end: string, group: Partial<{ timezone: string | null; fk_tool_id: number | null }> = {}) => ({
  fk_slot_id: slotId,
  fk_pilot_user_id: pilotId,
  slot: {
    slot_id: slotId,
    slot_date: new Date(`${DAY}T00:00:00.000Z`),
    start_time: start,
    end_time: end,
    slot_group: { slot_group_id: 3, timezone: 'Europe/Rome', fk_tool_id: 9, ...group },
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.slot_booking.findMany.mockResolvedValue([]);
  prismaMock.public_users.findMany.mockResolvedValue([]);
  prismaMock.tool.findMany.mockResolvedValue([]);
  prismaMock.slot_mission.findMany.mockResolvedValue([]);
  prismaMock.pilot_mission.findMany.mockResolvedValue([]);
});

describe('getClientScheduledFlights', () => {
  it('only queries approved, active slots of the client’s own slot groups for that day', async () => {
    const now = new Date('2026-11-26T10:00:00Z');
    await getClientScheduledFlights(CLIENT, OWNER, DAY, now);
    const where = prismaMock.slot_booking.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('APPROVED');
    expect(where.slot.is_active).toBe(true);
    expect(where.slot.slot_date).toEqual(new Date(`${DAY}T00:00:00.000Z`));
    // Groups waiting to be published stay hidden, as they are from pilots.
    expect(where.slot.slot_group).toEqual({ fk_owner_id: OWNER, fk_client_id: CLIENT, OR: [{ publish_at: null }, { publish_at: { lte: now } }] });
  });

  it('rejects a malformed date before touching the database', async () => {
    await expect(getClientScheduledFlights(CLIENT, OWNER, '26-11-2026')).rejects.toBeInstanceOf(ClientScheduledFlightsError);
    await expect(getClientScheduledFlights(CLIENT, OWNER, '2026-13-45')).rejects.toBeInstanceOf(ClientScheduledFlightsError);
    // Would roll over to 2 March in JS and show that day's flights under the wrong date.
    await expect(getClientScheduledFlights(CLIENT, OWNER, '2026-02-30')).rejects.toBeInstanceOf(ClientScheduledFlightsError);
    await expect(getClientScheduledFlights(CLIENT, OWNER, '2026-02-29')).rejects.toBeInstanceOf(ClientScheduledFlightsError);
    expect(prismaMock.slot_booking.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty day without further queries', async () => {
    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY, new Date('2026-11-26T10:00:00Z'));
    expect(res).toEqual({ date: DAY, serverNow: '2026-11-26T10:00:00.000Z', flights: [] });
    expect(prismaMock.public_users.findMany).not.toHaveBeenCalled();
    expect(prismaMock.pilot_mission.findMany).not.toHaveBeenCalled();
  });

  it('returns each flight with pilot info, system and site-zone instants, sorted by start, without the slot group name', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(2, 11, '14:00', '18:00'), booking(1, 12, '08:00', '12:00')]);
    prismaMock.public_users.findMany.mockResolvedValue([
      { user_id: 11, first_name: 'Pia', last_name: 'Pilot', username: 'pia', email: 'pia@example.com', phone: '+39 111', users_profile: { profile_picture: 'avatars/pia.png' } },
      { user_id: 12, first_name: null, last_name: null, username: 'marco', email: null, phone: null, users_profile: null },
    ]);
    prismaMock.tool.findMany.mockResolvedValue([{ tool_id: 9, tool_name: 'Matrice 30', tool_code: 'M30' }]);

    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    expect(res.flights.map((f) => f.slotId)).toEqual([1, 2]);

    const [first, second] = res.flights;
    expect(first).toMatchObject({ date: DAY, start: '08:00', end: '12:00', timezone: 'Europe/Rome', systemName: 'Matrice 30' });
    // 08:00 in Rome on 26 Nov (CET, UTC+1) is 07:00 UTC.
    expect(first.startAt).toBe('2026-11-26T07:00:00.000Z');
    expect(first.endAt).toBe('2026-11-26T11:00:00.000Z');
    expect(first.pilot).toEqual({ userId: 12, name: 'marco', email: null, phone: null, avatarUrl: null });
    expect(second.pilot).toEqual({ userId: 11, name: 'Pia Pilot', email: 'pia@example.com', phone: '+39 111', avatarUrl: 'https://s3/signed' });

    // Nothing of the slot-booking workflow is exposed.
    for (const f of res.flights) {
      expect(f).not.toHaveProperty('groupName');
      expect(f).not.toHaveProperty('groupId');
      expect(f).not.toHaveProperty('pending');
    }
  });

  it('treats a group without a time zone as UTC and a group without a system as none', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(5, 11, '06:00', '10:00', { timezone: null, fk_tool_id: null })]);
    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    expect(res.flights[0]).toMatchObject({ timezone: 'UTC', startAt: '2026-11-26T06:00:00.000Z', systemName: null });
    expect(res.flights[0].pilot.name).toBe('Pilot');
    expect(prismaMock.tool.findMany).not.toHaveBeenCalled();
  });

  it('shows only the client’s own missions flown by the slot pilot, with their progress', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(1, 11, '08:00', '12:00')]);
    prismaMock.slot_mission.findMany.mockResolvedValue([
      { fk_slot_id: 1, fk_pilot_mission_id: 100 },
      { fk_slot_id: 1, fk_pilot_mission_id: 101 },
      { fk_slot_id: 1, fk_pilot_mission_id: 102 },
    ]);
    prismaMock.pilot_mission.findMany.mockResolvedValue([
      { pilot_mission_id: 101, mission_code: 'M-101', mission_name: 'Bridge', status_name: 'COMPLETED', fk_mission_status_id: 3, actual_start: new Date('2026-11-26T07:10:00Z'), actual_end: new Date('2026-11-26T07:40:00Z'), scheduled_start: null, fk_pilot_user_id: 11 },
      { pilot_mission_id: 100, mission_code: 'M-100', mission_name: 'Road', status_name: null, fk_mission_status_id: 1, actual_start: null, actual_end: null, scheduled_start: new Date('2026-11-26T09:00:00Z'), fk_pilot_user_id: 11 },
      // Reassigned to another pilot after linking: hidden.
      { pilot_mission_id: 102, mission_code: 'M-102', mission_name: 'Other', status_name: null, fk_mission_status_id: 1, actual_start: null, actual_end: null, scheduled_start: null, fk_pilot_user_id: 99 },
    ]);

    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    const missionWhere = prismaMock.pilot_mission.findMany.mock.calls[0][0].where;
    expect(missionWhere.fk_owner_id).toBe(OWNER);
    expect(missionWhere.OR).toEqual([{ fk_client_id: CLIENT }, { planning: { fk_client_id: CLIENT } }]);
    expect(res.flights[0].missions).toEqual([
      { id: 101, code: 'M-101', name: 'Bridge', progress: 'completed' },
      { id: 100, code: 'M-100', name: 'Road', progress: 'planned' },
    ]);
  });

  it('accepts a leap day', async () => {
    await expect(getClientScheduledFlights(CLIENT, OWNER, '2028-02-29')).resolves.toMatchObject({ date: '2028-02-29' });
  });

  it('runs an overnight slot into the next day', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(1, 11, '22:00', '06:00', { timezone: 'UTC' })]);
    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    expect(res.flights[0]).toMatchObject({ startAt: '2026-11-26T22:00:00.000Z', endAt: '2026-11-27T06:00:00.000Z' });
  });

  it('keeps one flight per slot even if the data holds two approved bookings', async () => {
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(1, 11, '08:00', '12:00'), booking(1, 12, '08:00', '12:00')]);
    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    expect(res.flights).toHaveLength(1);
    expect(res.flights[0].pilot.userId).toBe(11);
  });

  it('still returns the flights when the weather service fails', async () => {
    (getWeatherForSlots as jest.Mock).mockRejectedValueOnce(new Error('down'));
    prismaMock.slot_booking.findMany.mockResolvedValue([booking(1, 11, '08:00', '12:00')]);
    const res = await getClientScheduledFlights(CLIENT, OWNER, DAY);
    expect(res.flights).toHaveLength(1);
    expect(res.flights[0].weather).toBeNull();
  });
});
