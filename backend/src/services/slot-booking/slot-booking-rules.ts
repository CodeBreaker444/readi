import 'server-only';

import { intervalsOverlap, slotInterval } from '@/lib/slot-booking-logic';
import { addDaysIso, prettyDate, slotLabel } from '@/lib/slot-booking-utils';
import { prisma } from '@/lib/prisma';


export const dateStr = (d: Date) => d.toISOString().slice(0, 10);
export const toDate = (s: string) => new Date(`${s}T00:00:00.000Z`);

export interface CollisionCheck {
  pilotId: number;
  slot: { slotId: number; date: string; start: string; end: string };
}

export const collisionKey = (pilotId: number, slotId: number) => `${pilotId}:${slotId}`;

/**
 * A pilot "collides" with a slot when they are already APPROVED for another slot whose time window overlaps it,
 * in any slot group of the company (the same date and time in a different group counts).
 * Returns a readable description of the clashing assignment per `pilotId:slotId`; pairs without a clash are absent.
 */
export async function findCollisions(ownerId: number, checks: CollisionCheck[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (!checks.length) return result;

  const dates = checks.map((c) => c.slot.date).sort();
  const rows = await prisma.slot_booking.findMany({
    where: {
      status: 'APPROVED',
      fk_pilot_user_id: { in: [...new Set(checks.map((c) => c.pilotId))] },
      slot: {
        // ±1 day: a 22:00–06:00 slot reaches into the next date.
        slot_date: { gte: toDate(addDaysIso(dates[0], -1)), lte: toDate(addDaysIso(dates[dates.length - 1], 1)) },
        slot_group: { fk_owner_id: ownerId },
      },
    },
    select: {
      fk_slot_id: true,
      fk_pilot_user_id: true,
      slot: { select: { slot_date: true, start_time: true, end_time: true, slot_group: { select: { name: true } } } },
    },
  });

  for (const c of checks) {
    const mine = slotInterval(c.slot.date, c.slot.start, c.slot.end);
    const clash = rows.find(
      (r) =>
        r.fk_pilot_user_id === c.pilotId &&
        r.fk_slot_id !== c.slot.slotId &&
        intervalsOverlap(mine, slotInterval(dateStr(r.slot.slot_date), r.slot.start_time, r.slot.end_time)),
    );
    if (clash) {
      result.set(
        collisionKey(c.pilotId, c.slot.slotId),
        `${prettyDate(dateStr(clash.slot.slot_date))} ${slotLabel({ start: clash.slot.start_time, end: clash.slot.end_time })} in “${clash.slot.slot_group.name}”`,
      );
    }
  }
  return result;
}

/** Hours before the approval day during which pilots cannot change their requests (0 = never). */
export async function getLockHours(ownerId: number): Promise<number> {
  const row = await prisma.slot_settings.findUnique({ where: { fk_owner_id: ownerId }, select: { modify_lock_hours: true } });
  return row?.modify_lock_hours ?? 24;
}

/**
 * Pilot groups that restrict a slot group. Empty = the group is offered to every pilot.
 * Returned as groupId -> pilot group ids.
 */
export async function getAudiences(groupIds: number[]): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!groupIds.length) return map;
  const rows = await prisma.slot_group_pilot_group.findMany({ where: { fk_slot_group_id: { in: groupIds } } });
  for (const r of rows) map.set(r.fk_slot_group_id, [...(map.get(r.fk_slot_group_id) ?? []), r.fk_pilot_group_id]);
  return map;
}

/** Ids of the pilot groups a user belongs to. */
export async function getMembershipIds(userId: number): Promise<Set<number>> {
  const rows = await prisma.pilot_group_member.findMany({ where: { fk_user_id: userId }, select: { fk_pilot_group_id: true } });
  return new Set(rows.map((r) => r.fk_pilot_group_id));
}

/** Members of the given pilot groups. */
export async function getMemberIds(pilotGroupIds: number[]): Promise<Set<number>> {
  if (!pilotGroupIds.length) return new Set();
  const rows = await prisma.pilot_group_member.findMany({
    where: { fk_pilot_group_id: { in: pilotGroupIds } },
    select: { fk_user_id: true },
  });
  return new Set(rows.map((r) => r.fk_user_id));
}
