import 'server-only';

import type { CalendarSlot, SlotMode, WeekCalendar } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { addDaysIso, SLOT_DATE_RE } from '@/lib/slot-booking-utils';
import { avatarUrl, fullName } from './pilot-group-service';
import { dateStr, toDate } from './slot-booking-rules';
import { ASSIGNED_NOTE, assertManager, SlotBookingError } from './slot-booking-service';
import { getWeatherForSlots, isInForecastRange } from './slot-weather-service';

export const CALENDAR_DAYS = 7;

/**
 * The OPM's week calendar: every active slot of 7 days across all slot groups with its group, client, approved
 * pilot, waiting requests and weather, so nothing needs to be opened to see the state of the week.
 */
export async function getWeekCalendar(user: SessionUser, start: string): Promise<WeekCalendar> {
  assertManager(user);
  if (!SLOT_DATE_RE.test(start) || Number.isNaN(Date.parse(`${start}T00:00:00Z`))) throw new SlotBookingError('Invalid date');
  const dates = Array.from({ length: CALENDAR_DAYS }, (_, i) => addDaysIso(start, i));

  const slots = await prisma.slot.findMany({
    where: { slot_date: { gte: toDate(dates[0]), lte: toDate(dates[CALENDAR_DAYS - 1]) }, is_active: true, slot_group: { fk_owner_id: user.ownerId } },
    include: {
      slot_group: { select: { slot_group_id: true, name: true, description: true, slot_mode: true, is_blocked: true, approval_days: true, fk_client_id: true } },
    },
    orderBy: [{ slot_date: 'asc' }, { start_time: 'asc' }, { slot_id: 'asc' }],
  });

  const ids = slots.map((s) => s.slot_id);
  const clientIds = [...new Set(slots.map((s) => s.slot_group.fk_client_id).filter((v): v is number => v != null))];
  const [bookings, clients, wx] = await Promise.all([
    ids.length
      ? prisma.slot_booking.findMany({
          where: { fk_slot_id: { in: ids }, status: { in: ['APPROVED', 'PENDING'] } },
          select: { fk_slot_id: true, fk_pilot_user_id: true, status: true, requested_at: true, decided_at: true, decision_note: true },
          orderBy: { requested_at: 'asc' },
        })
      : Promise.resolve([]),
    clientIds.length ? prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } }) : Promise.resolve([]),
    getWeatherForSlots(user.ownerId, slots.map((s) => ({ id: s.slot_id, date: dateStr(s.slot_date), start: s.start_time, end: s.end_time }))),
  ]);

  const userIds = [...new Set(bookings.map((b) => b.fk_pilot_user_id))];
  const users = userIds.length
    ? await prisma.public_users.findMany({
        where: { user_id: { in: userIds } },
        select: { user_id: true, first_name: true, last_name: true, username: true, user_role: true, email: true, users_profile: { select: { profile_picture: true } } },
      })
    : [];
  const approvedIds = new Set(bookings.filter((b) => b.status === 'APPROVED').map((b) => b.fk_pilot_user_id));
  const avatars = new Map(
    await Promise.all(users.filter((u) => approvedIds.has(u.user_id)).map(async (u) => [u.user_id, await avatarUrl(u.users_profile?.profile_picture)] as const)),
  );
  const byId = new Map(users.map((u) => [u.user_id, u]));
  const clientName = new Map(clients.map((c) => [c.client_id, c.client_name]));

  const rows = slots.map<CalendarSlot>((s) => {
    const mine = bookings.filter((b) => b.fk_slot_id === s.slot_id);
    const approved = mine.find((b) => b.status === 'APPROVED');
    const pilot = approved ? byId.get(approved.fk_pilot_user_id) : undefined;
    return {
      slotId: s.slot_id,
      date: dateStr(s.slot_date),
      start: s.start_time,
      end: s.end_time,
      groupId: s.slot_group.slot_group_id,
      groupName: s.slot_group.name,
      groupDescription: s.slot_group.description ?? '',
      mode: s.slot_group.slot_mode as SlotMode,
      blocked: s.slot_group.is_blocked,
      approvalDays: s.slot_group.approval_days,
      clientName: s.slot_group.fk_client_id != null ? (clientName.get(s.slot_group.fk_client_id) ?? null) : null,
      pilot:
        approved && pilot
          ? {
              userId: pilot.user_id,
              name: fullName(pilot),
              email: pilot.email ?? null,
              role: pilot.user_role,
              avatarUrl: avatars.get(pilot.user_id) ?? null,
              approvedAt: approved.decided_at?.toISOString() ?? null,
              assignedByOpm: approved.decision_note === ASSIGNED_NOTE,
            }
          : null,
      pending: mine
        .filter((b) => b.status === 'PENDING')
        .map((b) => {
          const u = byId.get(b.fk_pilot_user_id);
          return { userId: b.fk_pilot_user_id, name: u ? fullName(u) : 'Pilot', requestedAt: b.requested_at.toISOString() };
        }),
      weather: wx.weather[s.slot_id] ?? null,
    };
  });

  const assigned = rows.filter((r) => r.pilot).length;
  return {
    start,
    days: dates.map((date) => ({ date, slots: rows.filter((r) => r.date === date) })),
    total: rows.length,
    assigned,
    unassigned: rows.length - assigned,
    weatherNote: !dates.some((d) => isInForecastRange(d)) ? 'out_of_range' : wx.note,
    weatherFetchedAt: wx.fetchedAt ?? null,
  };
}
