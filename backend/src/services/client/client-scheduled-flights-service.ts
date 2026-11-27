import 'server-only';

import type { ClientScheduledFlight, ClientScheduledFlights, SlotWeather } from '@/config/types/slot-booking';
import { prisma } from '@/lib/prisma';
import { missionProgress } from '@/lib/slot-booking-logic';
import { SLOT_DATE_RE, zonedSlotInterval } from '@/lib/slot-booking-utils';
import { avatarUrl, fullName } from '../slot-booking/pilot-group-service';
import { dateStr, groupZone, toDate } from '../slot-booking/slot-booking-rules';
import { getWeatherForSlots } from '../slot-booking/slot-weather-service';

export class ClientScheduledFlightsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Started missions by start time, then scheduled ones, undated last. */
const missionTime = (m: { actual_start: Date | null; scheduled_start: Date | null }) =>
  (m.actual_start ?? m.scheduled_start)?.getTime() ?? Number.MAX_SAFE_INTEGER;

/** Weather is a nicety here: without it (no system, service down) the flights still show. */
async function flightWeather(ownerId: number, slots: Parameters<typeof getWeatherForSlots>[1]): Promise<Record<number, SlotWeather>> {
  if (!slots.length) return {};
  try {
    return (await getWeatherForSlots(ownerId, slots)).weather;
  } catch {
    return {};
  }
}

/**
 * Client portal "Scheduled flights": the approved slots of one site day of every slot group created for the
 * signed-in client, with the pilot who flies each one. Read only. Slot groups, requests, pending pilots and other
 * clients' slots never leave the server.
 */
export async function getClientScheduledFlights(clientId: number, ownerId: number, date: string, now = new Date()): Promise<ClientScheduledFlights> {
  // The round trip rejects dates JS would roll over (2026-02-30 → 2026-03-02).
  if (!SLOT_DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || dateStr(toDate(date)) !== date) {
    throw new ClientScheduledFlightsError('Invalid date');
  }

  const bookings = await prisma.slot_booking.findMany({
    where: {
      status: 'APPROVED',
      slot: {
        slot_date: toDate(date),
        is_active: true,
        // A group still waiting to be published is hidden from the client, as it is from pilots.
        slot_group: { fk_owner_id: ownerId, fk_client_id: clientId, OR: [{ publish_at: null }, { publish_at: { lte: now } }] },
      },
    },
    select: {
      fk_slot_id: true,
      fk_pilot_user_id: true,
      slot: {
        select: {
          slot_id: true,
          slot_date: true,
          start_time: true,
          end_time: true,
          slot_group: { select: { slot_group_id: true, timezone: true, fk_tool_id: true } },
        },
      },
    },
  });

  // One approved pilot per slot; keep the first should the data ever hold more.
  const bySlot = new Map<number, (typeof bookings)[number]>();
  for (const b of bookings) if (!bySlot.has(b.fk_slot_id)) bySlot.set(b.fk_slot_id, b);
  const rows = [...bySlot.values()];

  const slotIds = rows.map((b) => b.fk_slot_id);
  const pilotIds = [...new Set(rows.map((b) => b.fk_pilot_user_id))];
  const toolIds = [...new Set(rows.map((b) => b.slot.slot_group.fk_tool_id).filter((v): v is number => v != null))];

  const [users, tools, links, weather] = await Promise.all([
    pilotIds.length
      ? prisma.public_users.findMany({
          where: { user_id: { in: pilotIds } },
          select: { user_id: true, first_name: true, last_name: true, username: true, email: true, phone: true, users_profile: { select: { profile_picture: true } } },
        })
      : Promise.resolve([]),
    toolIds.length
      ? prisma.tool.findMany({ where: { tool_id: { in: toolIds }, fk_owner_id: ownerId }, select: { tool_id: true, tool_name: true, tool_code: true } })
      : Promise.resolve([]),
    slotIds.length
      ? prisma.slot_mission.findMany({ where: { fk_slot_id: { in: slotIds }, fk_owner_id: ownerId }, select: { fk_slot_id: true, fk_pilot_mission_id: true } })
      : Promise.resolve([]),
    flightWeather(
      ownerId,
      rows.map((b) => ({ id: b.fk_slot_id, groupId: b.slot.slot_group.slot_group_id, date, start: b.slot.start_time, end: b.slot.end_time })),
    ),
  ]);

  // Only this client's own missions, flown by the slot's pilot: a mission of another client or a reassigned one stays hidden.
  const missions = links.length
    ? await prisma.pilot_mission.findMany({
        where: {
          pilot_mission_id: { in: [...new Set(links.map((l) => l.fk_pilot_mission_id))] },
          fk_owner_id: ownerId,
          OR: [{ fk_client_id: clientId }, { planning: { fk_client_id: clientId } }],
        },
        select: {
          pilot_mission_id: true,
          mission_code: true,
          mission_name: true,
          status_name: true,
          fk_mission_status_id: true,
          actual_start: true,
          actual_end: true,
          scheduled_start: true,
          fk_pilot_user_id: true,
        },
      })
    : [];

  const avatars = new Map(await Promise.all(users.map(async (u) => [u.user_id, await avatarUrl(u.users_profile?.profile_picture)] as const)));
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const toolName = new Map(tools.map((t) => [t.tool_id, t.tool_name || t.tool_code || null]));
  const missionById = new Map(missions.map((m) => [m.pilot_mission_id, m]));

  const flights = rows.map<ClientScheduledFlight>((b) => {
    const tz = groupZone(b.slot.slot_group);
    const slotDate = dateStr(b.slot.slot_date);
    const { from, to } = zonedSlotInterval(slotDate, b.slot.start_time, b.slot.end_time, tz);
    const u = userById.get(b.fk_pilot_user_id);
    const toolId = b.slot.slot_group.fk_tool_id;
    return {
      slotId: b.fk_slot_id,
      date: slotDate,
      start: b.slot.start_time,
      end: b.slot.end_time,
      startAt: new Date(from).toISOString(),
      endAt: new Date(to).toISOString(),
      timezone: tz,
      pilot: {
        userId: b.fk_pilot_user_id,
        name: u ? fullName(u) : 'Pilot',
        email: u?.email ?? null,
        phone: u?.phone ?? null,
        avatarUrl: avatars.get(b.fk_pilot_user_id) ?? null,
      },
      systemName: toolId != null ? (toolName.get(toolId) ?? null) : null,
      missions: links
        .filter((l) => l.fk_slot_id === b.fk_slot_id)
        .map((l) => missionById.get(l.fk_pilot_mission_id))
        .filter((m): m is (typeof missions)[number] => !!m && m.fk_pilot_user_id === b.fk_pilot_user_id)
        .sort((x, y) => missionTime(x) - missionTime(y) || x.pilot_mission_id - y.pilot_mission_id)
        .map((m) => ({
          id: m.pilot_mission_id,
          code: m.mission_code,
          name: m.mission_name,
          progress: missionProgress({ statusName: m.status_name, statusId: m.fk_mission_status_id, actualStart: m.actual_start, actualEnd: m.actual_end }),
        })),
      weather: weather[b.fk_slot_id] ?? null,
    };
  });

  flights.sort((a, b) => a.startAt.localeCompare(b.startAt) || a.slotId - b.slotId);
  return { date, serverNow: now.toISOString(), flights };
}
