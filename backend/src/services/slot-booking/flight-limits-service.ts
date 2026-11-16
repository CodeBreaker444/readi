import 'server-only';

import type { PilotFlight } from '@/config/types/slot-booking';
import { prisma } from '@/lib/prisma';
import { cycleWindow, flightLevel } from '@/lib/slot-booking-logic';
import { todayIso } from '@/lib/slot-booking-utils';
import { toDate } from './slot-booking-rules';

const round1 = (n: number) => Math.round(n * 10) / 10;
const hours = (minutes: number | null | undefined) => round1((minutes ?? 0) / 60);

/** Day each flying-hours cycle starts (1–28), from the company's Slot Settings. */
export async function getCycleStartDay(ownerId: number): Promise<number> {
  const row = await prisma.slot_settings.findUnique({ where: { fk_owner_id: ownerId }, select: { cycle_start_day: true } });
  return row?.cycle_start_day ?? 1;
}

/** Monthly limits (hours) of the given users; users without one are absent. */
export async function getFlightLimits(ownerId: number, userIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>();
  if (!userIds.length) return out;
  const rows = await prisma.pilot_flight_limit.findMany({ where: { fk_owner_id: ownerId, fk_user_id: { in: userIds } } });
  for (const r of rows) out.set(r.fk_user_id, Number(r.monthly_hours));
  return out;
}

/**
 * Hours flown this cycle (from the missions the pilot flew; flight_duration is stored in minutes), all-time hours
 * and the monthly limit, with the colour level the OPM sees: grey without a limit, yellow from 90%, red from 100%.
 * Every requested user gets an entry.
 */
export async function getPilotFlights(ownerId: number, userIds: number[], today = todayIso()): Promise<Map<number, PilotFlight>> {
  const out = new Map<number, PilotFlight>();
  const ids = [...new Set(userIds)];
  if (!ids.length) return out;

  const cycle = cycleWindow(await getCycleStartDay(ownerId), today);
  const base = { fk_owner_id: ownerId, fk_pilot_user_id: { in: ids } };
  const [limits, total, inCycle] = await Promise.all([
    getFlightLimits(ownerId, ids),
    prisma.pilot_mission.groupBy({ by: ['fk_pilot_user_id'], where: base, _sum: { flight_duration: true } }),
    prisma.pilot_mission.groupBy({
      by: ['fk_pilot_user_id'],
      where: { ...base, actual_start: { gte: toDate(cycle.start), lt: toDate(cycle.end) } },
      _sum: { flight_duration: true },
    }),
  ]);
  const totalBy = new Map(total.map((r) => [r.fk_pilot_user_id, hours(r._sum.flight_duration)]));
  const cycleBy = new Map(inCycle.map((r) => [r.fk_pilot_user_id, hours(r._sum.flight_duration)]));

  for (const id of ids) {
    const cycleHours = cycleBy.get(id) ?? 0;
    const limit = limits.get(id) ?? null;
    out.set(id, {
      cycleHours,
      totalHours: totalBy.get(id) ?? 0,
      limitHours: limit,
      level: flightLevel(cycleHours, limit),
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
    });
  }
  return out;
}

/** Saves monthly limits for users of the company; null removes a limit. */
export async function saveFlightLimits(ownerId: number, entries: Array<{ userId: number; hours: number | null }>): Promise<void> {
  if (!entries.length) return;
  const valid = await prisma.public_users.findMany({
    where: { fk_owner_id: ownerId, user_id: { in: entries.map((e) => e.userId) } },
    select: { user_id: true },
  });
  const ok = new Set(valid.map((v) => v.user_id));
  const now = new Date();
  await prisma.$transaction(
    entries
      .filter((e) => ok.has(e.userId))
      .map((e) =>
        e.hours === null
          ? prisma.pilot_flight_limit.deleteMany({ where: { fk_owner_id: ownerId, fk_user_id: e.userId } })
          : prisma.pilot_flight_limit.upsert({
              where: { fk_owner_id_fk_user_id: { fk_owner_id: ownerId, fk_user_id: e.userId } },
              create: { fk_owner_id: ownerId, fk_user_id: e.userId, monthly_hours: e.hours, updated_at: now },
              update: { monthly_hours: e.hours, updated_at: now },
            }),
      ),
  );
}
