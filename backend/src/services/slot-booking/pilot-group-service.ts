import 'server-only';

import type { PilotGroup, PilotGroupCandidate, PilotGroupInput, PilotGroupMember } from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { Prisma } from '@prisma/client';
import { logEvent } from '../auditLog/audit-log';
import { getFlightLimits, saveFlightLimits } from './flight-limits-service';
import { canManageSlots, SlotBookingError } from './slot-booking-service';

function assertManager(user: SessionUser) {
  if (!canManageSlots(user)) throw new SlotBookingError('Only the Operations Manager can manage pilot groups', 403);
}

export const fullName = (u: { first_name: string | null; last_name: string | null; username: string | null; user_id: number }) =>
  [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `User #${u.user_id}`;

const userSelect = {
  user_id: true,
  first_name: true,
  last_name: true,
  username: true,
  user_role: true,
  email: true,
  users_profile: { select: { profile_picture: true } },
} as const;

export async function avatarUrl(picture: string | null | undefined): Promise<string | null> {
  if (!picture) return null;
  if (picture.startsWith('avatars/') || picture.startsWith('profiles/')) {
    try {
      return await getPresignedDownloadUrl(picture, 3600);
    } catch {
      return null;
    }
  }
  return picture;
}

const groupInclude = {
  pilot_group_member: { include: { users: { select: userSelect } } },
  users: { select: userSelect },
} as const;

type GroupWithMembers = Prisma.pilot_groupGetPayload<{ include: typeof groupInclude }>;

async function mapGroup(g: GroupWithMembers): Promise<PilotGroup> {
  const limits = await getFlightLimits(g.fk_owner_id, g.pilot_group_member.map((m) => m.fk_user_id));
  const members: PilotGroupMember[] = (
    await Promise.all(
      g.pilot_group_member.map(async (m) => ({
        userId: m.users.user_id,
        name: fullName(m.users),
        email: m.users.email ?? null,
        role: m.users.user_role,
        avatarUrl: await avatarUrl(m.users.users_profile?.profile_picture),
        monthlyLimitHours: limits.get(m.users.user_id) ?? null,
      })),
    )
  ).sort((a, b) => a.name.localeCompare(b.name));
  return {
    id: g.pilot_group_id,
    name: g.name,
    description: g.description ?? '',
    memberCount: members.length,
    members,
    isExpert: g.is_expert,
    createdAt: g.created_at.toISOString(),
    createdByName: g.users ? fullName(g.users) : null,
  };
}

async function getOwned(user: SessionUser, id: number) {
  const g = await prisma.pilot_group.findFirst({ where: { pilot_group_id: id, fk_owner_id: user.ownerId }, include: groupInclude });
  if (!g) throw new SlotBookingError('Pilot group not found', 404);
  return g;
}

/** Every member must be an active user of the caller's company; anything else is rejected, not silently dropped. */
async function assertMembersValid(ownerId: number, memberIds: number[]) {
  if (!memberIds.length) return;
  const found = await prisma.public_users.findMany({
    where: { user_id: { in: memberIds }, fk_owner_id: ownerId, user_active: 'Y' },
    select: { user_id: true },
  });
  if (found.length !== memberIds.length) {
    const ok = new Set(found.map((f) => f.user_id));
    throw new SlotBookingError('Some selected users do not belong to your company or are inactive', 400, {
      field: 'memberIds',
      invalidIds: memberIds.filter((id) => !ok.has(id)),
    });
  }
}

const isUniqueViolation = (e: unknown) => (e as { code?: string })?.code === 'P2002';
const nameTaken = () => new SlotBookingError('A pilot group with this name already exists', 409, { field: 'name' });

async function assertNameFree(ownerId: number, name: string, exceptId?: number) {
  const rows = await prisma.pilot_group.findMany({
    where: {
      fk_owner_id: ownerId,
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId ? { NOT: { pilot_group_id: exceptId } } : {}),
    },
    select: { pilot_group_id: true },
    take: 1,
  });
  if (rows.length) throw nameTaken();
}

function audit(user: SessionUser, eventType: 'CREATE' | 'UPDATE' | 'DELETE', id: number, description: string, metadata: Record<string, unknown>) {
  logEvent({
    eventType,
    entityType: 'pilot_group',
    entityId: id,
    description,
    userId: user.userId,
    userName: user.fullname,
    userEmail: user.email,
    userRole: user.role,
    ownerId: user.ownerId,
    metadata,
  });
}

export async function listPilotGroups(user: SessionUser): Promise<PilotGroup[]> {
  assertManager(user);
  const rows = await prisma.pilot_group.findMany({
    where: { fk_owner_id: user.ownerId },
    include: groupInclude,
    orderBy: [{ name: 'asc' }],
  });
  return Promise.all(rows.map(mapGroup));
}

export async function listCandidates(user: SessionUser): Promise<PilotGroupCandidate[]> {
  assertManager(user);
  const rows = await prisma.public_users.findMany({
    where: { fk_owner_id: user.ownerId, user_active: 'Y' },
    select: userSelect,
  });
  const limits = await getFlightLimits(user.ownerId, rows.map((u) => u.user_id));
  const list = await Promise.all(
    rows.map(async (u) => ({
      userId: u.user_id,
      name: fullName(u),
      email: u.email ?? null,
      role: u.user_role,
      avatarUrl: await avatarUrl(u.users_profile?.profile_picture),
      monthlyLimitHours: limits.get(u.user_id) ?? null,
    })),
  );
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createPilotGroup(user: SessionUser, input: PilotGroupInput): Promise<PilotGroup> {
  assertManager(user);
  const name = input.name.trim();
  const memberIds = [...new Set(input.memberIds)];
  await assertMembersValid(user.ownerId, memberIds);
  await assertNameFree(user.ownerId, name);

  let id: number;
  try {
    const created = await prisma.pilot_group.create({
      data: {
        fk_owner_id: user.ownerId,
        name,
        description: input.description?.trim() || null,
        is_expert: input.isExpert ?? false,
        created_by: user.userId,
        pilot_group_member: { create: memberIds.map((fk_user_id) => ({ fk_user_id })) },
      },
      select: { pilot_group_id: true },
    });
    id = created.pilot_group_id;
  } catch (e) {
    if (isUniqueViolation(e)) throw nameTaken(); // two simultaneous creates
    throw e;
  }
  await saveFlightLimits(user.ownerId, input.flightLimits ?? []);
  audit(user, 'CREATE', id, `Created pilot group “${name}” (${memberIds.length} members)`, {
    group_id: id,
    group_name: name,
    member_ids: memberIds,
  });
  return mapGroup(await getOwned(user, id));
}

export async function updatePilotGroup(user: SessionUser, id: number, input: PilotGroupInput): Promise<PilotGroup> {
  assertManager(user);
  const existing = await getOwned(user, id);
  const name = input.name.trim();
  const memberIds = [...new Set(input.memberIds)];
  await assertMembersValid(user.ownerId, memberIds);
  await assertNameFree(user.ownerId, name, id);

  try {
    await prisma.$transaction([
      prisma.pilot_group.update({
        where: { pilot_group_id: id },
        data: { name, description: input.description?.trim() || null, is_expert: input.isExpert ?? existing.is_expert, updated_at: new Date() },
      }),
      prisma.pilot_group_member.deleteMany({ where: { fk_pilot_group_id: id, fk_user_id: { notIn: memberIds } } }),
      prisma.pilot_group_member.createMany({
        data: memberIds.map((fk_user_id) => ({ fk_pilot_group_id: id, fk_user_id })),
        skipDuplicates: true,
      }),
    ]);
  } catch (e) {
    if (isUniqueViolation(e)) throw nameTaken();
    throw e;
  }

  await saveFlightLimits(user.ownerId, input.flightLimits ?? []);
  const before = new Set(existing.pilot_group_member.map((m) => m.fk_user_id));
  const after = new Set(memberIds);
  audit(user, 'UPDATE', id, `Updated pilot group “${name}”`, {
    group_id: id,
    previous_name: existing.name,
    group_name: name,
    flight_limits_changed: (input.flightLimits ?? []).map((l) => ({ user_id: l.userId, hours: l.hours })),
    added: memberIds.filter((m) => !before.has(m)),
    removed: [...before].filter((m) => !after.has(m)),
  });
  return mapGroup(await getOwned(user, id));
}

export async function deletePilotGroup(user: SessionUser, id: number): Promise<void> {
  assertManager(user);
  const g = await getOwned(user, id);
  await prisma.pilot_group.delete({ where: { pilot_group_id: id } });
  audit(user, 'DELETE', id, `Deleted pilot group “${g.name}”`, { group_id: id, group_name: g.name, member_count: g.pilot_group_member.length });
}
