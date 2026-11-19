import 'server-only';

import type { SlotMissionCandidates, SlotWeather, TodayBoard, TodayMission, TodaySlot } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { missionProgress } from '@/lib/slot-booking-logic';
import { addDaysIso, slotLabel, todayInZone, zonedMidnight, zonedSlotInterval } from '@/lib/slot-booking-utils';
import { Prisma } from '@prisma/client';
import { dateStr, groupZone, toDate } from './slot-booking-rules';
import { audit, canManageSlots, SlotBookingError } from './slot-booking-service';
import { getWeatherForSlots } from './slot-weather-service';

/**
 * Today tab: the pilot's approved slots of the day, each linked to the missions flown in it.
 * Mission progress is read live from pilot_mission, so starting or finishing a mission on the Daily Board
 * shows up here on the next refresh without any extra bookkeeping.
 */

const MAX_LINK = 50;

const MISSION_SELECT = {
  pilot_mission_id: true,
  mission_code: true,
  mission_name: true,
  mission_description: true,
  status_name: true,
  fk_mission_status_id: true,
  scheduled_start: true,
  actual_start: true,
  actual_end: true,
  flight_duration: true,
  location: true,
  notes: true,
  fk_client_id: true,
  client: { select: { client_id: true, client_name: true } },
  tool: { select: { tool_name: true, tool_code: true } },
  pilot_mission_status: { select: { status_name: true } },
  pilot_mission_type: { select: { type_name: true } },
  pilot_mission_category: { select: { category_name: true } },
  planning: { select: { planning_name: true, client: { select: { client_id: true, client_name: true } } } },
  planning_logbook: { select: { mission_planning_code: true, mission_planning_desc: true } },
} satisfies Prisma.pilot_missionSelect;

type MissionRow = Prisma.pilot_missionGetPayload<{ select: typeof MISSION_SELECT }>;

function mapMission(m: MissionRow, linked?: { slotId: number; label: string }): TodayMission {
  const client = m.client ?? m.planning?.client ?? null;
  return {
    id: m.pilot_mission_id,
    code: m.mission_code,
    name: m.mission_name,
    description: m.mission_description,
    progress: missionProgress({ statusName: m.status_name, statusId: m.fk_mission_status_id, actualStart: m.actual_start, actualEnd: m.actual_end }),
    statusLabel: m.pilot_mission_status?.status_name ?? m.status_name ?? null,
    scheduledStart: m.scheduled_start?.toISOString() ?? null,
    actualStart: m.actual_start?.toISOString() ?? null,
    actualEnd: m.actual_end?.toISOString() ?? null,
    flightMinutes: m.flight_duration ?? null,
    location: m.location,
    notes: m.notes,
    clientId: client?.client_id ?? null,
    clientName: client?.client_name ?? null,
    droneName: m.tool?.tool_name ?? null,
    droneCode: m.tool?.tool_code ?? null,
    typeName: m.pilot_mission_type?.type_name ?? null,
    categoryName: m.pilot_mission_category?.category_name ?? null,
    planningName: m.planning?.planning_name ?? null,
    planCode: m.planning_logbook?.mission_planning_code ?? null,
    planDescription: m.planning_logbook?.mission_planning_desc ?? null,
    linkedSlotId: linked?.slotId ?? null,
    linkedSlotLabel: linked?.label ?? null,
  };
}

const byStart = (a: TodayMission, b: TodayMission) =>
  (a.actualStart ?? a.scheduledStart ?? '9999').localeCompare(b.actualStart ?? b.scheduledStart ?? '9999') || a.id - b.id;

/**
 * Labels ("06:00–14:00 · Group") of the slots the given missions are linked to.
 * Stale links are left out: a link only counts while its slot still has `pilotId` approved, otherwise (pilot
 * unassigned, slot closed, mission reassigned) nobody could unlink it and it would block the mission forever.
 */
async function linksOf(ownerId: number, missionIds: number[], pilotId: number): Promise<Map<number, { slotId: number; label: string }>> {
  if (!missionIds.length) return new Map();
  const all = await prisma.slot_mission.findMany({
    where: { fk_owner_id: ownerId, fk_pilot_mission_id: { in: missionIds } },
    select: { fk_slot_id: true, fk_pilot_mission_id: true },
  });
  const live = all.length
    ? new Set(
        (
          await prisma.slot_booking.findMany({
            where: { fk_slot_id: { in: [...new Set(all.map((l) => l.fk_slot_id))] }, status: 'APPROVED', fk_pilot_user_id: pilotId },
            select: { fk_slot_id: true },
          })
        ).map((b) => b.fk_slot_id),
      )
    : new Set<number>();
  const links = all.filter((l) => live.has(l.fk_slot_id));
  const slots = links.length
    ? await prisma.slot.findMany({
        where: { slot_id: { in: [...new Set(links.map((l) => l.fk_slot_id))] } },
        select: { slot_id: true, start_time: true, end_time: true, slot_group: { select: { name: true } } },
      })
    : [];
  const label = new Map(slots.map((s) => [s.slot_id, `${slotLabel({ start: s.start_time, end: s.end_time })} · ${s.slot_group.name}`]));
  return new Map(links.map((l) => [l.fk_pilot_mission_id, { slotId: l.fk_slot_id, label: label.get(l.fk_slot_id) ?? '' }]));
}

/**
 * Missions of `pilotId` that can be flown in a slot on the site day `[dayStart, dayEnd)`: scheduled or started that day,
 * still in progress, or planned without a date (the Daily Board shows those as today's). Imported, aborted and
 * not-yet-approved missions are left out, like on the Daily Board.
 */
function candidateWhere(ownerId: number, pilotId: number, dayStart: Date, dayEnd: Date): Prisma.pilot_missionWhereInput {
  return {
    fk_owner_id: ownerId,
    fk_pilot_user_id: pilotId,
    mission_metadata: { not: { is_imported: true } },
    AND: [
      { OR: [{ status_name: null }, { NOT: { status_name: { in: ['ABORTED', 'CANCELLED'], mode: 'insensitive' } } }] },
      { OR: [{ fk_mission_status_id: null }, { NOT: { fk_mission_status_id: 5 } }] },
      { OR: [{ opm_approval_status: null }, { opm_approval_status: 'APPROVED' }] },
      {
        OR: [
          { scheduled_start: { gte: dayStart, lt: dayEnd } },
          { actual_start: { gte: dayStart, lt: dayEnd } },
          { fk_mission_status_id: 2, actual_end: null },
          { status_name: 'IN_PROGRESS', actual_end: null },
          { scheduled_start: null, actual_start: null, fk_mission_status_id: 1 },
        ],
      },
    ],
  };
}

/**
 * Aborted or cancelled missions of the same day. An aborted mission is a closed record (see mission-lock) so it can
 * never be linked or restored here; the picker still lists it so the pilot can see why it is missing.
 */
function abortedWhere(ownerId: number, pilotId: number, dayStart: Date, dayEnd: Date): Prisma.pilot_missionWhereInput {
  return {
    fk_owner_id: ownerId,
    fk_pilot_user_id: pilotId,
    mission_metadata: { not: { is_imported: true } },
    AND: [
      { OR: [{ status_name: { in: ['ABORTED', 'CANCELLED'], mode: 'insensitive' } }, { fk_mission_status_id: 5 }] },
      { OR: [{ scheduled_start: { gte: dayStart, lt: dayEnd } }, { actual_start: { gte: dayStart, lt: dayEnd } }] },
    ],
  };
}

/** The site day of a slot, stretched to the slot's end for overnight slots. */
function slotDayWindow(date: string, start: string, end: string, tz: string) {
  const { from, to } = zonedSlotInterval(date, start, end, tz);
  const dayStart = zonedMidnight(date, tz);
  const dayEnd = Math.max(zonedMidnight(addDaysIso(date, 1), tz), to);
  return { from, to, dayStart: new Date(dayStart), dayEnd: new Date(dayEnd) };
}

// ───────────────────────── Today board ─────────────────────────

/** Weather is a nicety on this tab: without it (no system, service down) the slots still show. */
async function slotWeather(ownerId: number, slots: Parameters<typeof getWeatherForSlots>[1]): Promise<Record<number, SlotWeather>> {
  if (!slots.length) return {};
  try {
    return (await getWeatherForSlots(ownerId, slots)).weather;
  } catch {
    return {};
  }
}

export async function getTodayBoard(user: SessionUser, now = new Date()): Promise<TodayBoard> {
  // Site zones can be up to ±14 h away from UTC, so look one day either side and keep what is "today" at each site.
  const utcToday = dateStr(now);
  const bookings = await prisma.slot_booking.findMany({
    where: {
      fk_pilot_user_id: user.userId,
      status: 'APPROVED',
      slot: {
        is_active: true,
        slot_date: { gte: toDate(addDaysIso(utcToday, -2)), lte: toDate(addDaysIso(utcToday, 1)) },
        slot_group: { fk_owner_id: user.ownerId },
      },
    },
    include: {
      slot: {
        include: {
          slot_group: { select: { slot_group_id: true, name: true, timezone: true, fk_client_id: true, fk_tool_id: true } },
        },
      },
    },
  });

  const nowMs = now.getTime();
  const todays = bookings
    .map((b) => {
      const tz = groupZone(b.slot.slot_group);
      const date = dateStr(b.slot.slot_date);
      const { from, to } = zonedSlotInterval(date, b.slot.start_time, b.slot.end_time, tz);
      const siteToday = todayInZone(tz, now);
      // Today's slots at the site, plus last night's overnight slot while it is still running.
      const keep = date === siteToday || (date === addDaysIso(siteToday, -1) && to > nowMs);
      return keep ? { b, tz, date, from, to } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => a.from - b.from || a.b.fk_slot_id - b.b.fk_slot_id);

  const slotIds = todays.map((x) => x.b.fk_slot_id);
  const clientIds = [...new Set(todays.map((x) => x.b.slot.slot_group.fk_client_id).filter((v): v is number => v != null))];
  const toolIds = [...new Set(todays.map((x) => x.b.slot.slot_group.fk_tool_id).filter((v): v is number => v != null))];

  const [links, clients, tools, weather] = await Promise.all([
    slotIds.length
      ? prisma.slot_mission.findMany({ where: { fk_slot_id: { in: slotIds }, fk_owner_id: user.ownerId }, select: { fk_slot_id: true, fk_pilot_mission_id: true } })
      : Promise.resolve([]),
    clientIds.length ? prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } }) : Promise.resolve([]),
    toolIds.length ? prisma.tool.findMany({ where: { tool_id: { in: toolIds } }, select: { tool_id: true, tool_name: true, tool_code: true } }) : Promise.resolve([]),
    slotWeather(user.ownerId, todays.map((x) => ({ id: x.b.fk_slot_id, groupId: x.b.slot.slot_group.slot_group_id, date: x.date, start: x.b.slot.start_time, end: x.b.slot.end_time }))),
  ]);

  const missions = links.length
    ? await prisma.pilot_mission.findMany({
        // Only the pilot's own missions: one that was reassigned after linking must not show on this slot.
        where: { pilot_mission_id: { in: links.map((l) => l.fk_pilot_mission_id) }, fk_owner_id: user.ownerId, fk_pilot_user_id: user.userId },
        select: MISSION_SELECT,
      })
    : [];
  const missionById = new Map(missions.map((m) => [m.pilot_mission_id, m]));
  const clientName = new Map(clients.map((c) => [c.client_id, c.client_name]));
  const toolName = new Map(tools.map((t) => [t.tool_id, t.tool_name || t.tool_code || `System #${t.tool_id}`]));

  const slots = todays.map<TodaySlot>(({ b, tz, date, from, to }) => {
    const g = b.slot.slot_group;
    const label = `${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} · ${g.name}`;
    return {
      slotId: b.fk_slot_id,
      bookingId: b.booking_id,
      groupId: g.slot_group_id,
      groupName: g.name,
      clientId: g.fk_client_id ?? null,
      clientName: g.fk_client_id != null ? (clientName.get(g.fk_client_id) ?? null) : null,
      systemName: g.fk_tool_id != null ? (toolName.get(g.fk_tool_id) ?? null) : null,
      timezone: tz,
      date,
      start: b.slot.start_time,
      end: b.slot.end_time,
      startAt: new Date(from).toISOString(),
      endAt: new Date(to).toISOString(),
      missions: links
        .filter((l) => l.fk_slot_id === b.fk_slot_id)
        .map((l) => missionById.get(l.fk_pilot_mission_id))
        .filter((m): m is MissionRow => !!m)
        .map((m) => mapMission(m, { slotId: b.fk_slot_id, label }))
        .sort(byStart),
      weather: weather[b.fk_slot_id] ?? null,
    };
  });

  // Today's missions of the pilot that are not in any slot yet, so the tab can nudge them to link them.
  let unlinkedMissions = 0;
  if (slots.length) {
    const dayStart = new Date(Math.min(...todays.map((x) => zonedMidnight(x.date, x.tz))));
    const dayEnd = new Date(Math.max(...todays.map((x) => Math.max(zonedMidnight(addDaysIso(x.date, 1), x.tz), x.to))));
    const linkedIds = links.map((l) => l.fk_pilot_mission_id);
    unlinkedMissions = await prisma.pilot_mission.count({
      where: {
        ...candidateWhere(user.ownerId, user.userId, dayStart, dayEnd),
        ...(linkedIds.length ? { pilot_mission_id: { notIn: linkedIds } } : {}),
      },
    });
  }

  return { serverNow: now.toISOString(), slots, unlinkedMissions };
}

// ───────────────────────── Link missions ─────────────────────────

/** The slot with its approved pilot, checked so that only that pilot (or a manager) can change its missions. */
async function getLinkableSlot(user: SessionUser, slotId: number) {
  const slot = await prisma.slot.findFirst({
    where: { slot_id: slotId, slot_group: { fk_owner_id: user.ownerId } },
    include: { slot_group: { select: { slot_group_id: true, name: true, timezone: true, fk_client_id: true, client: { select: { client_name: true } } } } },
  });
  if (!slot) throw new SlotBookingError('Slot not found', 404);
  const booking = await prisma.slot_booking.findFirst({ where: { fk_slot_id: slotId, status: 'APPROVED' }, select: { fk_pilot_user_id: true } });
  if (!booking) throw new SlotBookingError('This slot has no assigned pilot', 409);
  if (!canManageSlots(user) && booking.fk_pilot_user_id !== user.userId) {
    throw new SlotBookingError('You can only link missions to your own slots', 403);
  }
  const tz = groupZone(slot.slot_group);
  const date = dateStr(slot.slot_date);
  return { slot, pilotId: booking.fk_pilot_user_id, tz, date, ...slotDayWindow(date, slot.start_time, slot.end_time, tz) };
}

/** Missions of the slot's pilot that can be linked to the slot, the best matches (scheduled inside the slot) first. */
export async function getSlotMissionCandidates(user: SessionUser, slotId: number): Promise<SlotMissionCandidates> {
  const s = await getLinkableSlot(user, slotId);
  const rows = await prisma.pilot_mission.findMany({
    where: candidateWhere(user.ownerId, s.pilotId, s.dayStart, s.dayEnd),
    select: MISSION_SELECT,
    orderBy: [{ scheduled_start: { sort: 'asc', nulls: 'last' } }, { pilot_mission_id: 'asc' }],
    take: 200,
  });
  const aborted = await prisma.pilot_mission.findMany({
    where: abortedWhere(user.ownerId, s.pilotId, s.dayStart, s.dayEnd),
    select: MISSION_SELECT,
    orderBy: [{ scheduled_start: { sort: 'asc', nulls: 'last' } }, { pilot_mission_id: 'asc' }],
    take: 50,
  });
  const links = await linksOf(user.ownerId, rows.map((r) => r.pilot_mission_id), s.pilotId);
  const inWindow = (m: TodayMission) => {
    const at = m.actualStart ?? m.scheduledStart;
    return at ? Date.parse(at) >= s.from && Date.parse(at) < s.to : false;
  };
  const open = rows
    .map((r) => mapMission(r, links.get(r.pilot_mission_id)))
    .sort((a, b) => Number(inWindow(b)) - Number(inWindow(a)) || byStart(a, b));
  const missions = [...open, ...aborted.map((r) => mapMission(r)).sort(byStart)];

  return {
    slot: {
      slotId,
      date: s.date,
      start: s.slot.start_time,
      end: s.slot.end_time,
      startAt: new Date(s.from).toISOString(),
      endAt: new Date(s.to).toISOString(),
      groupName: s.slot.slot_group.name,
      clientId: s.slot.slot_group.fk_client_id ?? null,
      clientName: s.slot.slot_group.client?.client_name ?? null,
    },
    missions,
  };
}

/** `skipped`: missions another request linked to a different slot at the very same moment. */
export async function linkSlotMissions(user: SessionUser, slotId: number, missionIds: number[]): Promise<{ linked: number; skipped: number }> {
  const ids = [...new Set(missionIds)];
  if (!ids.length) throw new SlotBookingError('Pick at least one mission');
  if (ids.length > MAX_LINK) throw new SlotBookingError(`At most ${MAX_LINK} missions can be linked at once`);

  const s = await getLinkableSlot(user, slotId);
  const eligible = await prisma.pilot_mission.findMany({
    where: { ...candidateWhere(user.ownerId, s.pilotId, s.dayStart, s.dayEnd), pilot_mission_id: { in: ids } },
    select: { pilot_mission_id: true, mission_code: true, mission_name: true },
  });
  if (eligible.length !== ids.length) {
    throw new SlotBookingError("Some missions cannot be linked: they are not this pilot's missions for the slot's day", 400);
  }

  const elsewhere = await linksOf(user.ownerId, ids, s.pilotId);
  const taken = [...elsewhere.entries()].filter(([, l]) => l.slotId !== slotId);
  if (taken.length) {
    const [missionId, l] = taken[0];
    const m = eligible.find((e) => e.pilot_mission_id === missionId);
    throw new SlotBookingError(`Mission ${m?.mission_code ?? `#${missionId}`} is already linked to ${l.label}. Unlink it there first.`, 409);
  }

  const fresh = ids.filter((id) => !elsewhere.has(id));
  if (!fresh.length) return { linked: 0, skipped: 0 };

  // Whatever is still linked to another slot at this point is stale (live links threw above): free it first.
  await prisma.slot_mission.deleteMany({ where: { fk_pilot_mission_id: { in: fresh }, fk_slot_id: { not: slotId }, fk_owner_id: user.ownerId } });

  const created = await prisma.slot_mission.createMany({
    data: fresh.map((id) => ({ fk_slot_id: slotId, fk_pilot_mission_id: id, fk_owner_id: user.ownerId, linked_by: user.userId })),
    skipDuplicates: true,
  });

  // A concurrent request can link a mission elsewhere between the check and the insert; the database then skips it
  // silently, so read back what really ended up on this slot instead of trusting the number we tried to insert.
  const linkedIds =
    created.count === fresh.length
      ? fresh
      : (
          await prisma.slot_mission.findMany({
            where: { fk_slot_id: slotId, fk_pilot_mission_id: { in: fresh }, linked_by: user.userId },
            select: { fk_pilot_mission_id: true },
          })
        ).map((r) => r.fk_pilot_mission_id);

  if (linkedIds.length) {
    const names = eligible.filter((e) => linkedIds.includes(e.pilot_mission_id)).map((e) => e.mission_code ?? e.mission_name ?? `#${e.pilot_mission_id}`);
    audit(
      user,
      'UPDATE',
      'slot',
      slotId,
      `Missions linked to slot ${s.date} ${slotLabel({ start: s.slot.start_time, end: s.slot.end_time })} (${s.slot.slot_group.name}): ${names.join(', ')}`,
      { action: 'missions_linked', slotId, groupId: s.slot.slot_group.slot_group_id, missionIds: linkedIds },
    );
  }
  return { linked: linkedIds.length, skipped: fresh.length - linkedIds.length };
}

/**
 * Who may unlink: the OPM, the slot's approved pilot, or the pilot the mission belongs to. The last one matters for
 * links nobody else can reach any more (the slot lost its pilot, or the mission was reassigned): they never need an
 * approved pilot on the slot.
 */
export async function unlinkSlotMission(user: SessionUser, slotId: number, missionId: number): Promise<void> {
  const slot = await prisma.slot.findFirst({
    where: { slot_id: slotId, slot_group: { fk_owner_id: user.ownerId } },
    include: { slot_group: { select: { slot_group_id: true, name: true } } },
  });
  if (!slot) throw new SlotBookingError('Slot not found', 404);

  const link = await prisma.slot_mission.findFirst({ where: { fk_slot_id: slotId, fk_pilot_mission_id: missionId, fk_owner_id: user.ownerId }, select: { fk_slot_id: true } });
  if (!link) throw new SlotBookingError('This mission is not linked to the slot', 404);

  if (!canManageSlots(user)) {
    const [mission, booking] = await Promise.all([
      prisma.pilot_mission.findFirst({ where: { pilot_mission_id: missionId, fk_owner_id: user.ownerId }, select: { fk_pilot_user_id: true } }),
      prisma.slot_booking.findFirst({ where: { fk_slot_id: slotId, status: 'APPROVED' }, select: { fk_pilot_user_id: true } }),
    ]);
    if (mission?.fk_pilot_user_id !== user.userId && booking?.fk_pilot_user_id !== user.userId) {
      throw new SlotBookingError('You can only unlink missions of your own slots', 403);
    }
  }

  await prisma.slot_mission.deleteMany({ where: { fk_slot_id: slotId, fk_pilot_mission_id: missionId, fk_owner_id: user.ownerId } });
  const date = dateStr(slot.slot_date);
  audit(
    user,
    'UPDATE',
    'slot',
    slotId,
    `Mission #${missionId} unlinked from slot ${date} ${slotLabel({ start: slot.start_time, end: slot.end_time })} (${slot.slot_group.name})`,
    { action: 'mission_unlinked', slotId, groupId: slot.slot_group.slot_group_id, missionId },
  );
}
