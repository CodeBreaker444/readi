import 'server-only';

import type { DayPreview, DayPreviewRow, SlotCandidate, SlotCandidates } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { prettyDate, SLOT_DATE_RE, slotLabel, todayIso } from '@/lib/slot-booking-utils';
import { getPilotFlights } from './flight-limits-service';
import { buildMerits } from './pilot-stats-service';
import { collisionKey, dateStr, findCollisions, getAudiences, getMemberIds, toDate } from './slot-booking-rules';
import { ASSIGNED_NOTE, assertManager, audit, getOwnedSlot, notify, pilotTarget, SlotBookingError, userNames } from './slot-booking-service';
import { getWeatherForSlots, isInForecastRange } from './slot-weather-service';

const slotText = (s: { slot_date: Date; start_time: string; end_time: string }) =>
  `${slotLabel({ start: s.start_time, end: s.end_time })} on ${prettyDate(dateStr(s.slot_date))}`;

/** Pilots the OPM may pick for a slot: everyone, or only members of the pilot groups the slot group is offered to. */
async function eligibleIds(groupId: number): Promise<Set<number> | null> {
  const audience = (await getAudiences([groupId])).get(groupId) ?? [];
  return audience.length ? getMemberIds(audience) : null;
}

/**
 * The assign-PIC dropdown: every eligible pilot with hours, score, whether they asked for the slot and whether
 * they are free (no overlapping assignment). Requested pilots first, then free pilots (experts first when the
 * weather is tough), then by score. Pilots with a collision are listed last and cannot be assigned.
 */
export async function getSlotCandidates(user: SessionUser, slotId: number): Promise<SlotCandidates> {
  assertManager(user);
  const slot = await getOwnedSlot(user, slotId);
  const date = dateStr(slot.slot_date);

  const [merits, eligible, live, wx] = await Promise.all([
    buildMerits(user.ownerId),
    eligibleIds(slot.fk_slot_group_id),
    prisma.slot_booking.findMany({ where: { fk_slot_id: slotId, status: { not: 'REJECTED' } }, select: { fk_pilot_user_id: true, status: true } }),
    getWeatherForSlots(user.ownerId, [{ id: slotId, groupId: slot.fk_slot_group_id, date, start: slot.start_time, end: slot.end_time }]),
  ]);

  const pool = merits.filter((m) => !eligible || eligible.has(m.userId));
  const collisions = await findCollisions(
    user.ownerId,
    pool.map((m) => ({ pilotId: m.userId, slot: { slotId, date, start: slot.start_time, end: slot.end_time } })),
  );
  const requested = new Set(live.map((l) => l.fk_pilot_user_id));
  const flights = await getPilotFlights(user.ownerId, pool.map((m) => m.userId));
  const weather = wx.weather[slotId] ?? null;

  const candidates = pool
    .map<SlotCandidate>((m) => ({
      userId: m.userId,
      name: m.name,
      email: m.email,
      avatarUrl: m.avatarUrl,
      role: m.role,
      groups: m.groups,
      expert: m.groups.some((g) => g.expert),
      hours90: m.hours90,
      score: m.score,
      requested: requested.has(m.userId),
      collision: collisions.get(collisionKey(m.userId, slotId)) ?? null,
      flight: flights.get(m.userId)!,
    }))
    .sort((a, b) => {
      const rank = (c: SlotCandidate) => (c.collision ? 3 : c.requested ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (weather?.level === 'tough' && a.expert !== b.expert) return a.expert ? -1 : 1;
      return b.score - a.score || a.name.localeCompare(b.name);
    });

  return {
    slotId,
    groupName: slot.slot_group.name,
    date,
    start: slot.start_time,
    end: slot.end_time,
    weather,
    assignedPilotId: live.find((l) => l.status === 'APPROVED')?.fk_pilot_user_id ?? null,
    candidates,
  };
}

/** Assigns a pilot to a slot directly (approving their request when they made one). */
export async function assignPilot(user: SessionUser, slotId: number, pilotId: number): Promise<{ bookingId: number }> {
  assertManager(user);
  const slot = await getOwnedSlot(user, slotId);
  const date = dateStr(slot.slot_date);
  if (!slot.is_active) throw new SlotBookingError('This slot is not open', 409);
  if (date < todayIso()) throw new SlotBookingError('This slot is in the past', 409);

  const pilot = await prisma.public_users.findFirst({
    where: { user_id: pilotId, fk_owner_id: user.ownerId, user_active: 'Y' },
    select: { user_id: true },
  });
  if (!pilot) throw new SlotBookingError('Pilot not found', 404);

  const eligible = await eligibleIds(slot.fk_slot_group_id);
  if (eligible && !eligible.has(pilotId)) {
    throw new SlotBookingError('This pilot is not in the pilot groups this slot group is offered to', 400);
  }

  const clash = (await findCollisions(user.ownerId, [{ pilotId, slot: { slotId, date, start: slot.start_time, end: slot.end_time } }])).get(collisionKey(pilotId, slotId));
  const names = await userNames([pilotId]);
  const pilotName = names.get(pilotId) ?? 'Pilot';
  if (clash) throw new SlotBookingError(`${pilotName} is already assigned to an overlapping slot: ${clash}`, 409, { collision: clash });

  const { bookingId, created, declined } = await prisma
    .$transaction(async (tx) => {
      await tx.$queryRaw`SELECT slot_id FROM public.slot WHERE slot_id = ${slotId} FOR UPDATE`;
      const approved = await tx.slot_booking.findFirst({ where: { fk_slot_id: slotId, status: 'APPROVED' }, select: { booking_id: true } });
      if (approved) throw new SlotBookingError('A pilot is already assigned to this slot. Unassign them first.', 409);

      const now = new Date();
      const existing = await tx.slot_booking.findFirst({
        where: { fk_slot_id: slotId, fk_pilot_user_id: pilotId, status: { not: 'REJECTED' } },
        select: { booking_id: true },
      });
      const decision = { status: 'APPROVED', decided_at: now, decided_by: user.userId };
      const booking = existing
        ? await tx.slot_booking.update({ where: { booking_id: existing.booking_id }, data: decision })
        : await tx.slot_booking.create({
            data: { fk_slot_id: slotId, fk_slot_group_id: slot.fk_slot_group_id, fk_pilot_user_id: pilotId, ...decision, decision_note: ASSIGNED_NOTE },
          });

      const others = await tx.slot_booking.findMany({
        where: { fk_slot_id: slotId, status: 'PENDING', NOT: { booking_id: booking.booking_id } },
        select: { booking_id: true, fk_pilot_user_id: true },
      });
      if (others.length) {
        await tx.slot_booking.updateMany({
          where: { booking_id: { in: others.map((o) => o.booking_id) } },
          data: { status: 'REJECTED', decided_at: now, decided_by: user.userId, decision_note: 'Another pilot was selected' },
        });
      }
      return { bookingId: booking.booking_id, created: !existing, declined: others };
    })
    .catch((e: unknown) => {
      if ((e as { code?: string })?.code === 'P2002') throw new SlotBookingError('A pilot is already assigned to this slot', 409);
      throw e;
    });

  audit(user, created ? 'CREATE' : 'UPDATE', 'slot_booking', bookingId,
    `Assigned ${pilotName} to ${prettyDate(date)} ${slotLabel({ start: slot.start_time, end: slot.end_time })} in “${slot.slot_group.name}”`,
    {
      group_id: slot.fk_slot_group_id, group_name: slot.slot_group.name, slot_id: slotId, booking_id: bookingId, date,
      decision: 'APPROVED', assigned_directly: created, pilot_id: pilotId, pilot_name: pilotName, auto_declined: declined.map((d) => d.fk_pilot_user_id),
    });

  void notify(user.ownerId, await pilotTarget(pilotId), 'Slot assigned', `You were assigned ${slotText(slot)} in “${slot.slot_group.name}”.`);
  for (const d of declined) {
    void notify(user.ownerId, await pilotTarget(d.fk_pilot_user_id), 'Slot request declined', `Your request for ${slotText(slot)} was not selected.`);
  }
  return { bookingId };
}

/** Takes the assigned pilot off a slot so another can be picked. */
export async function unassignPilot(user: SessionUser, slotId: number): Promise<void> {
  assertManager(user);
  const slot = await getOwnedSlot(user, slotId);
  const booking = await prisma.slot_booking.findFirst({ where: { fk_slot_id: slotId, status: 'APPROVED' }, select: { booking_id: true, fk_pilot_user_id: true } });
  if (!booking) throw new SlotBookingError('No pilot is assigned to this slot', 404);

  await prisma.slot_booking.update({
    where: { booking_id: booking.booking_id },
    data: { status: 'REJECTED', decided_at: new Date(), decided_by: user.userId, decision_note: 'Unassigned by OPM' },
  });
  const pilotName = (await userNames([booking.fk_pilot_user_id])).get(booking.fk_pilot_user_id) ?? 'Pilot';
  const date = dateStr(slot.slot_date);
  audit(user, 'UPDATE', 'slot_booking', booking.booking_id,
    `Unassigned ${pilotName} from ${prettyDate(date)} ${slotLabel({ start: slot.start_time, end: slot.end_time })} in “${slot.slot_group.name}”`,
    { group_id: slot.fk_slot_group_id, group_name: slot.slot_group.name, slot_id: slotId, booking_id: booking.booking_id, date, decision: 'UNASSIGNED', pilot_id: booking.fk_pilot_user_id, pilot_name: pilotName });
  void notify(user.ownerId, await pilotTarget(booking.fk_pilot_user_id), 'Slot assignment removed',
    `Your assignment for ${slotText(slot)} in “${slot.slot_group.name}” was removed by the OPM.`, { warning: true });
}

/**
 * Operations day sheet: every active slot of one day across all slot groups with its client and assigned pilot,
 * so the OPM can see at a glance which slots still have nobody.
 */
export async function getDayPreview(user: SessionUser, date: string): Promise<DayPreview> {
  assertManager(user);
  if (!SLOT_DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new SlotBookingError('Invalid date');

  const slots = await prisma.slot.findMany({
    where: { slot_date: toDate(date), is_active: true, slot_group: { fk_owner_id: user.ownerId } },
    include: { slot_group: { select: { slot_group_id: true, name: true, fk_client_id: true } } },
    orderBy: [{ start_time: 'asc' }, { slot_id: 'asc' }],
  });

  const ids = slots.map((s) => s.slot_id);
  const clientIds = [...new Set(slots.map((s) => s.slot_group.fk_client_id).filter((v): v is number => v != null))];
  const [bookings, clients, wx] = await Promise.all([
    ids.length
      ? prisma.slot_booking.findMany({ where: { fk_slot_id: { in: ids }, status: { in: ['APPROVED', 'PENDING'] } }, select: { fk_slot_id: true, fk_pilot_user_id: true, status: true } })
      : Promise.resolve([]),
    clientIds.length ? prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } }) : Promise.resolve([]),
    getWeatherForSlots(user.ownerId, slots.map((s) => ({ id: s.slot_id, groupId: s.slot_group.slot_group_id, date, start: s.start_time, end: s.end_time }))),
  ]);
  const names = await userNames(bookings.filter((b) => b.status === 'APPROVED').map((b) => b.fk_pilot_user_id));
  const clientName = new Map(clients.map((c) => [c.client_id, c.client_name]));

  const rows = slots.map<DayPreviewRow>((s) => {
    const approved = bookings.find((b) => b.fk_slot_id === s.slot_id && b.status === 'APPROVED');
    return {
      slotId: s.slot_id,
      groupId: s.slot_group.slot_group_id,
      groupName: s.slot_group.name,
      clientName: s.slot_group.fk_client_id != null ? (clientName.get(s.slot_group.fk_client_id) ?? null) : null,
      start: s.start_time,
      end: s.end_time,
      pilotId: approved?.fk_pilot_user_id ?? null,
      pilotName: approved ? (names.get(approved.fk_pilot_user_id) ?? 'Pilot') : null,
      pending: bookings.filter((b) => b.fk_slot_id === s.slot_id && b.status === 'PENDING').length,
      weather: wx.weather[s.slot_id] ?? null,
    };
  });
  const assigned = rows.filter((r) => r.pilotId !== null).length;
  return {
    date,
    rows,
    total: rows.length,
    assigned,
    unassigned: rows.length - assigned,
    weatherNote: !isInForecastRange(date) ? 'out_of_range' : wx.note,
    weatherFetchedAt: wx.fetchedAt ?? null,
  };
}
