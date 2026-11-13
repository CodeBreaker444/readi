import 'server-only';

import type { MeritRow, Merits, MyStats } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { computeMerits, isWeekend, MERIT_WEIGHTS, MERIT_WINDOW_DAYS } from '@/lib/slot-booking-logic';
import { SLOT_BOOKER_ROLES } from '@/lib/slot-booking-utils';
import { avatarUrl, fullName } from './pilot-group-service';
import { dateStr } from './slot-booking-rules';
import { assertManager } from './slot-booking-service';

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface HoursByPilot {
  total: number;
  recent: number;
}

/** Hours flown per pilot, from the missions they flew (flight_duration is stored in minutes). */
export async function getFlightHours(ownerId: number, userIds: number[], since: Date): Promise<Map<number, HoursByPilot>> {
  const out = new Map<number, HoursByPilot>();
  if (!userIds.length) return out;
  const base = { fk_owner_id: ownerId, fk_pilot_user_id: { in: userIds } };
  const [total, recent] = await Promise.all([
    prisma.pilot_mission.groupBy({ by: ['fk_pilot_user_id'], where: base, _sum: { flight_duration: true } }),
    prisma.pilot_mission.groupBy({ by: ['fk_pilot_user_id'], where: { ...base, actual_start: { gte: since } }, _sum: { flight_duration: true } }),
  ]);
  const hours = (min: number | null | undefined) => round1((min ?? 0) / 60);
  for (const id of userIds) out.set(id, { total: 0, recent: 0 });
  for (const r of total) if (r.fk_pilot_user_id != null) out.get(r.fk_pilot_user_id)!.total = hours(r._sum.flight_duration);
  for (const r of recent) if (r.fk_pilot_user_id != null) out.get(r.fk_pilot_user_id)!.recent = hours(r._sum.flight_duration);
  return out;
}

/**
 * Every pilot of the company with hours, availability and score: users with the pilot role plus anyone placed in a
 * pilot group (e.g. an external pilot with another role). Sorted best first.
 */
export async function buildMerits(ownerId: number, now = new Date()): Promise<MeritRow[]> {
  const since = new Date(now.getTime() - MERIT_WINDOW_DAYS * 86_400_000);

  const groups = await prisma.pilot_group.findMany({ where: { fk_owner_id: ownerId }, select: { pilot_group_id: true, name: true, is_expert: true } });
  const members = groups.length
    ? await prisma.pilot_group_member.findMany({
        where: { fk_pilot_group_id: { in: groups.map((g) => g.pilot_group_id) } },
        select: { fk_pilot_group_id: true, fk_user_id: true },
      })
    : [];
  const groupById = new Map(groups.map((g) => [g.pilot_group_id, g]));

  const users = await prisma.public_users.findMany({
    where: {
      fk_owner_id: ownerId,
      user_active: 'Y',
      OR: [{ user_role: { in: [...SLOT_BOOKER_ROLES] } }, { user_id: { in: [...new Set(members.map((m) => m.fk_user_id))] } }],
    },
    select: { user_id: true, first_name: true, last_name: true, username: true, user_role: true, email: true, users_profile: { select: { profile_picture: true } } },
  });
  if (!users.length) return [];
  const ids = users.map((u) => u.user_id);

  const [hours, requests, avatars] = await Promise.all([
    getFlightHours(ownerId, ids, since),
    prisma.slot_booking.findMany({
      where: { fk_pilot_user_id: { in: ids }, requested_at: { gte: since }, slot: { slot_group: { fk_owner_id: ownerId } } },
      select: { fk_pilot_user_id: true, status: true, slot: { select: { slot_date: true } } },
    }),
    Promise.all(users.map((u) => avatarUrl(u.users_profile?.profile_picture))),
  ]);

  const stat = new Map(ids.map((id) => [id, { requests: 0, weekend: 0, approved: 0 }]));
  for (const r of requests) {
    const s = stat.get(r.fk_pilot_user_id)!;
    s.requests++;
    if (isWeekend(dateStr(r.slot.slot_date))) s.weekend++;
    if (r.status === 'APPROVED') s.approved++;
  }

  const scores = new Map(
    computeMerits(ids.map((id) => ({ userId: id, requests: stat.get(id)!.requests, weekendRequests: stat.get(id)!.weekend, hours: hours.get(id)!.recent }))).map((m) => [m.userId, m]),
  );

  return users
    .map<MeritRow>((u, i) => ({
      userId: u.user_id,
      name: fullName(u),
      email: u.email ?? null,
      avatarUrl: avatars[i],
      role: u.user_role,
      groups: members
        .filter((m) => m.fk_user_id === u.user_id)
        .map((m) => groupById.get(m.fk_pilot_group_id))
        .filter((g): g is NonNullable<typeof g> => !!g)
        .map((g) => ({ id: g.pilot_group_id, name: g.name, expert: g.is_expert }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      hours90: hours.get(u.user_id)!.recent,
      hoursTotal: hours.get(u.user_id)!.total,
      requests90: stat.get(u.user_id)!.requests,
      weekendRequests90: stat.get(u.user_id)!.weekend,
      approved90: stat.get(u.user_id)!.approved,
      score: scores.get(u.user_id)!.score,
      rank: scores.get(u.user_id)!.rank,
    }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
}

export async function getMerits(user: SessionUser): Promise<Merits> {
  assertManager(user);
  return { windowDays: MERIT_WINDOW_DAYS, weights: { ...MERIT_WEIGHTS }, rows: await buildMerits(user.ownerId) };
}

/** The signed-in pilot's own hours, availability and rank. */
export async function getMyStats(user: SessionUser): Promise<MyStats> {
  const rows = await buildMerits(user.ownerId);
  const mine = rows.find((r) => r.userId === user.userId);
  if (mine) {
    return {
      windowDays: MERIT_WINDOW_DAYS,
      hours90: mine.hours90,
      hoursTotal: mine.hoursTotal,
      requests90: mine.requests90,
      weekendRequests90: mine.weekendRequests90,
      approved90: mine.approved90,
      score: mine.score,
      rank: mine.rank,
      pilots: rows.length,
    };
  }
  // Not part of the ranked population (e.g. a manager): still report the hours.
  const hours = (await getFlightHours(user.ownerId, [user.userId], new Date(Date.now() - MERIT_WINDOW_DAYS * 86_400_000))).get(user.userId)!;
  return { windowDays: MERIT_WINDOW_DAYS, hours90: hours.recent, hoursTotal: hours.total, requests90: 0, weekendRequests90: 0, approved90: 0, score: 0, rank: 0, pilots: rows.length };
}
