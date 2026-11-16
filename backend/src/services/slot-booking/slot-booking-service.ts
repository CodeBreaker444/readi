import 'server-only';

import { env } from '@/backend/config/env';
import type {
  ApprovedSlotRow,
  Booking,
  GroupDetail,
  MyBookingRow,
  NewSlotGroupInput,
  Slot,
  SlotAuditRow,
  SlotDefaults,
  SlotGroup,
  SlotMe,
  PilotFlight,
  SlotSystem,
  SlotWeather,
} from '@/config/types/slot-booking';
import type { SessionUser } from '@/lib/auth/server-session';
import { DRONE_SITE_SELECT, resolveSystemLocation } from '@/lib/btf/location';
import { prisma } from '@/lib/prisma';
import { getFileBufferFromS3, getPresignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3Client';
import {
  nextApprovalDay,
  prettyDate,
  SLOT_BOOKER_ROLES,
  SLOT_DATE_RE,
  SLOT_MANAGER_ROLES,
  SLOT_TIME_RE,
  slotLabel,
  timeBlocks,
  todayIso,
  groupDates,
  weekdayOf,
  approvalDaysLabel,
} from '@/lib/slot-booking-utils';
import { Prisma } from '@prisma/client';
import { sendNotificationEmailWithAttachments } from '../../../../lib/resend/mail';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '../email/email-limit-service';
import { logEvent, type AuditEventType } from '../auditLog/audit-log';
import { isPublished, isWeekend, modificationLock, scheduleError } from '@/lib/slot-booking-logic';
import {
  collisionKey,
  dateStr,
  findCollisions,
  getAudiences,
  getLockHours,
  getMemberIds,
  getMembershipIds,
  toDate,
} from './slot-booking-rules';
import { getPilotFlights } from './flight-limits-service';
import { getPilotProfiles, type PilotProfileBase } from './pilot-stats-service';
import { getWeatherForSlots } from './slot-weather-service';

export class SlotBookingError extends Error {
  constructor(
    message: string,
    public status = 400,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SlotBookingError';
  }
}

const ACTION_URL = '/operations/slot-booking';
const NOTIFICATION_TYPE = 'SLOT_BOOKING';
const NOTIFICATION_TYPE_WARNING = 'SLOT_WARNING';
const PDF_MAX_BYTES = 10 * 1024 * 1024;
export const SLOT_AUDIT_ENTITIES = ['slot_group', 'slot', 'slot_booking', 'pilot_group'] as const;


export const canManageSlots = (user: SessionUser) => (SLOT_MANAGER_ROLES as readonly string[]).includes(user.role);
export const canBookSlots = (user: SessionUser) => (SLOT_BOOKER_ROLES as readonly string[]).includes(user.role);

export function getMe(user: SessionUser): SlotMe {
  return { userId: user.userId, name: user.fullname, role: user.role, canManage: canManageSlots(user), canBook: canBookSlots(user) };
}

export function assertManager(user: SessionUser) {
  if (!canManageSlots(user)) throw new SlotBookingError('Only the Operations Manager can do this', 403);
}
function assertBooker(user: SessionUser) {
  if (!canBookSlots(user)) throw new SlotBookingError('Only pilots can request slots', 403);
}


type GroupRow = Prisma.slot_groupGetPayload<object>;

export async function userNames(ids: Array<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((v): v is number => v != null))];
  if (!unique.length) return new Map();
  const rows = await prisma.public_users.findMany({
    where: { user_id: { in: unique } },
    select: { user_id: true, first_name: true, last_name: true, username: true },
  });
  return new Map(
    rows.map((u) => [u.user_id, [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || `User #${u.user_id}`]),
  );
}

interface GroupMeta {
  clientName: string | null;
  systemName: string | null;
  audience: Array<{ id: number; name: string }>;
}

/** Client names and the pilot groups each slot group is offered to, loaded for a whole page of groups at once. */
async function loadGroupMeta(rows: GroupRow[]): Promise<Map<number, GroupMeta>> {
  const out = new Map<number, GroupMeta>();
  if (!rows.length) return out;
  const clientIds = [...new Set(rows.map((r) => r.fk_client_id).filter((v): v is number => v != null))];
  const toolIds = [...new Set(rows.map((r) => r.fk_tool_id).filter((v): v is number => v != null))];
  const [clients, audiences, tools] = await Promise.all([
    clientIds.length
      ? prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } })
      : Promise.resolve([]),
    getAudiences(rows.map((r) => r.slot_group_id)),
    toolIds.length
      ? prisma.tool.findMany({ where: { tool_id: { in: toolIds } }, select: { tool_id: true, tool_name: true, tool_code: true } })
      : Promise.resolve([]),
  ]);
  const toolName = new Map(tools.map((t) => [t.tool_id, t.tool_name || t.tool_code || `System #${t.tool_id}`]));
  const pgIds = [...new Set([...audiences.values()].flat())];
  const pgs = pgIds.length
    ? await prisma.pilot_group.findMany({ where: { pilot_group_id: { in: pgIds } }, select: { pilot_group_id: true, name: true } })
    : [];
  const clientName = new Map(clients.map((c) => [c.client_id, c.client_name]));
  const pgName = new Map(pgs.map((g) => [g.pilot_group_id, g.name]));
  for (const r of rows) {
    out.set(r.slot_group_id, {
      clientName: r.fk_client_id != null ? (clientName.get(r.fk_client_id) ?? null) : null,
      systemName: r.fk_tool_id != null ? (toolName.get(r.fk_tool_id) ?? null) : null,
      audience: (audiences.get(r.slot_group_id) ?? [])
        .map((id) => ({ id, name: pgName.get(id) ?? `Group #${id}` }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }
  return out;
}

/**
 * What a pilot may see: groups that are already published AND either offered to everyone or to a pilot group
 * the pilot belongs to. Managers see everything, so callers skip this for them.
 */
async function visibleToPilot<T extends { slot_group_id: number; publish_at: Date | null }>(user: SessionUser, rows: T[]): Promise<T[]> {
  const published = rows.filter((r) => isPublished(r.publish_at));
  if (!published.length) return [];
  const [audiences, mine] = await Promise.all([getAudiences(published.map((r) => r.slot_group_id)), getMembershipIds(user.userId)]);
  return published.filter((r) => {
    const audience = audiences.get(r.slot_group_id);
    return !audience?.length || audience.some((id) => mine.has(id));
  });
}

async function assertGroupVisible(user: SessionUser, group: GroupRow) {
  if (canManageSlots(user)) return;
  if (!(await visibleToPilot(user, [group])).length) throw new SlotBookingError('Slot group not found', 404);
}

function mapGroup(g: GroupRow, createdByName: string | null, stats?: SlotGroup['stats'], meta?: GroupMeta): SlotGroup {
  return {
    id: g.slot_group_id,
    name: g.name,
    description: g.description ?? '',
    mode: g.slot_mode as SlotGroup['mode'],
    hourStart: g.hour_start,
    hourEnd: g.hour_end,
    rangeMode: g.range_mode as SlotGroup['rangeMode'],
    startDate: dateStr(g.start_date),
    blocked: g.is_blocked,
    approvalDays: g.approval_days,
    createdAt: g.created_at.toISOString(),
    createdByName,
    ...(stats ? { stats } : {}),
    clientId: g.fk_client_id ?? null,
    clientName: meta?.clientName ?? null,
    systemId: g.fk_tool_id ?? null,
    systemName: meta?.systemName ?? null,
    publishAt: g.publish_at?.toISOString() ?? null,
    published: isPublished(g.publish_at),
    audience: meta?.audience ?? [],
  };
}

async function getOwnedGroup(user: SessionUser, groupId: number) {
  const g = await prisma.slot_group.findFirst({ where: { slot_group_id: groupId, fk_owner_id: user.ownerId } });
  if (!g) throw new SlotBookingError('Slot group not found', 404);
  return g;
}

export async function getOwnedSlot(user: SessionUser, slotId: number) {
  const slot = await prisma.slot.findFirst({
    where: { slot_id: slotId, slot_group: { fk_owner_id: user.ownerId } },
    include: { slot_group: true },
  });
  if (!slot) throw new SlotBookingError('Slot not found', 404);
  return slot;
}


export function audit(
  user: SessionUser,
  eventType: AuditEventType,
  entityType: (typeof SLOT_AUDIT_ENTITIES)[number],
  entityId: number,
  description: string,
  metadata: Record<string, unknown>,
) {
  logEvent({
    eventType,
    entityType,
    entityId,
    description,
    userId: user.userId,
    userName: user.fullname,
    userEmail: user.email,
    userRole: user.role,
    ownerId: user.ownerId,
    metadata,
  });
}

export interface NotifyTarget {
  userId: number;
  email: string | null;
}

/** decision_note stored when an OPM assigns a pilot who never requested the slot. */
export const ASSIGNED_NOTE = 'Assigned by OPM';

/** In-app notification + email for each target. Never throws: a notification failure must not break the booking. */
export async function notify(
  ownerId: number,
  targets: NotifyTarget[],
  title: string,
  message: string,
  opts: {
    attachment?: { fileKey: string; fileName: string } | null;
    /** Shown as a warning (amber, high priority) in the bell, the top-right popup and the Notifications page. */
    warning?: boolean;
    data?: Record<string, unknown>;
  } = {},
): Promise<void> {
  const { attachment, warning = false, data } = opts;
  const type = warning ? NOTIFICATION_TYPE_WARNING : NOTIFICATION_TYPE;
  try {
    if (!targets.length) return;
    const notificationData = { ...(data ?? {}), ...(attachment ? { attachment: attachment.fileName } : {}) };
    await prisma.notification.createMany({
      data: targets.map((t) => ({
        fk_user_id: t.userId,
        notification_type: type,
        notification_title: title,
        notification_message: message,
        priority: warning ? 'high' : 'normal',
        is_read: false,
        action_url: ACTION_URL,
        created_at: new Date(),
        ...(Object.keys(notificationData).length ? { notification_data: notificationData } : {}),
      })),
    });

    const emails = [...new Set(targets.map((t) => t.email).filter((e): e is string => !!e))];
    if (!emails.length) return;
    if (await isDailyEmailLimitReached(ownerId)) {
      console.log('[slot-booking] daily email limit reached for owner', ownerId);
      return;
    }

    let attachments: Array<{ filename: string; content: Buffer }> = [];
    if (attachment) {
      try {
        const { buffer } = await getFileBufferFromS3(attachment.fileKey);
        attachments = [{ filename: attachment.fileName, content: buffer }];
      } catch (err) {
        console.error('[slot-booking] could not load attachment for email', err);
      }
    }
    const sent = await sendNotificationEmailWithAttachments(
      emails,
      title,
      message,
      type,
      `${env.APP_URL ?? ''}${ACTION_URL}`,
      attachments,
    );
    if (sent) await incrementDailyEmailCount(ownerId);
  } catch (err) {
    console.error('[slot-booking] notify failed', err);
  }
}

/** All OPMs of the company (falls back to admins when the company has no OPM). */
export async function managerTargets(ownerId: number): Promise<NotifyTarget[]> {
  const find = (roles: string[]) =>
    prisma.public_users.findMany({
      where: { fk_owner_id: ownerId, user_active: 'Y', user_role: { in: roles } },
      select: { user_id: true, email: true },
    });
  let rows = await find(['OPM']);
  if (!rows.length) rows = await find(['ADMIN']);
  return rows.map((r) => ({ userId: r.user_id, email: r.email }));
}

export async function pilotTarget(userId: number): Promise<NotifyTarget[]> {
  const u = await prisma.public_users.findUnique({ where: { user_id: userId }, select: { user_id: true, email: true } });
  return u ? [{ userId: u.user_id, email: u.email }] : [];
}

// ───────────────────────── Settings ─────────────────────────

const FALLBACK_DEFAULTS: SlotDefaults = {
  mode: 'SHIFT',
  hourStart: 6,
  hourEnd: 22,
  rangeMode: 'WEEK',
  blocked: false,
  approvalDays: [1, 4],
  modifyLockHours: 24,
  cycleStartDay: 1,
};

export async function getSettings(ownerId: number): Promise<SlotDefaults> {
  const row = await prisma.slot_settings.findUnique({ where: { fk_owner_id: ownerId } });
  if (!row) return FALLBACK_DEFAULTS;
  return {
    mode: row.slot_mode as SlotDefaults['mode'],
    hourStart: row.hour_start,
    hourEnd: row.hour_end,
    rangeMode: row.range_mode as SlotDefaults['rangeMode'],
    blocked: row.is_blocked,
    approvalDays: row.approval_days,
    modifyLockHours: ([0, 24, 48].includes(row.modify_lock_hours) ? row.modify_lock_hours : 24) as SlotDefaults['modifyLockHours'],
    cycleStartDay: row.cycle_start_day,
  };
}

export async function saveSettings(user: SessionUser, input: SlotDefaults): Promise<SlotDefaults> {
  assertManager(user);
  const data = {
    slot_mode: input.mode,
    hour_start: input.hourStart,
    hour_end: input.hourEnd,
    range_mode: input.rangeMode,
    is_blocked: input.blocked,
    approval_days: [...new Set(input.approvalDays)].sort(),
    modify_lock_hours: input.modifyLockHours,
    cycle_start_day: input.cycleStartDay,
    updated_at: new Date(),
  };
  await prisma.slot_settings.upsert({
    where: { fk_owner_id: user.ownerId },
    create: { fk_owner_id: user.ownerId, ...data },
    update: data,
  });
  return getSettings(user.ownerId);
}

// ───────────────────────── Groups ─────────────────────────

export async function listGroups(user: SessionUser): Promise<SlotGroup[]> {
  const all = await prisma.slot_group.findMany({
    where: { fk_owner_id: user.ownerId },
    orderBy: [{ created_at: 'desc' }, { slot_group_id: 'desc' }],
  });
  const groups = canManageSlots(user) ? all : await visibleToPilot(user, all);
  if (!groups.length) return [];
  const ids = groups.map((g) => g.slot_group_id);
  const today = toDate(todayIso());

  const [activeSlots, approvedUpcoming, bookingCounts, names, metas] = await Promise.all([
    prisma.slot.groupBy({
      by: ['fk_slot_group_id'],
      where: { fk_slot_group_id: { in: ids }, is_active: true, slot_date: { gte: today } },
      _count: { _all: true },
    }),
    prisma.slot_booking.groupBy({
      by: ['fk_slot_group_id'],
      where: { fk_slot_group_id: { in: ids }, status: 'APPROVED', slot: { is_active: true, slot_date: { gte: today } } },
      _count: { _all: true },
    }),
    prisma.slot_booking.groupBy({
      by: ['fk_slot_group_id', 'status'],
      where: { fk_slot_group_id: { in: ids } },
      _count: { _all: true },
    }),
    userNames(groups.map((g) => g.created_by)),
    loadGroupMeta(groups),
  ]);

  return groups.map((g) => {
    const count = (status: string) =>
      bookingCounts.find((b) => b.fk_slot_group_id === g.slot_group_id && b.status === status)?._count._all ?? 0;
    return mapGroup(g, g.created_by ? (names.get(g.created_by) ?? null) : null, {
      openSlots: Math.max(
        0,
        (activeSlots.find((o) => o.fk_slot_group_id === g.slot_group_id)?._count._all ?? 0) -
          (approvedUpcoming.find((o) => o.fk_slot_group_id === g.slot_group_id)?._count._all ?? 0),
      ),
      pending: count('PENDING'),
      approved: count('APPROVED'),
    }, metas.get(g.slot_group_id));
  });
}

export async function getGroupDetail(user: SessionUser, groupId: number): Promise<GroupDetail> {
  const g = await getOwnedGroup(user, groupId);
  const manager = canManageSlots(user);
  await assertGroupVisible(user, g);

  const [slots, bookings, names, metas] = await Promise.all([
    prisma.slot.findMany({ where: { fk_slot_group_id: groupId }, orderBy: [{ slot_date: 'asc' }, { start_time: 'asc' }] }),
    prisma.slot_booking.findMany({
      where: { fk_slot_group_id: groupId, ...(manager ? {} : { status: { not: 'REJECTED' } }) },
      orderBy: { requested_at: 'asc' },
    }),
    userNames([g.created_by]),
    loadGroupMeta([g]),
  ]);
  const pilotNames = await userNames(bookings.map((b) => b.fk_pilot_user_id));

  const slotDto = (x: (typeof slots)[number]) => ({ slotId: x.slot_id, date: dateStr(x.slot_date), start: x.start_time, end: x.end_time });
  const slotById = new Map(slots.map((x) => [x.slot_id, x]));
  // Manager extras: overlapping assignments of pilots with pending requests, and the 7-day forecast per slot.
  const [collisions, forecast, flights, profiles] = manager
    ? await Promise.all([
        findCollisions(
          user.ownerId,
          bookings
            .filter((b) => b.status === 'PENDING' && slotById.has(b.fk_slot_id))
            .map((b) => ({ pilotId: b.fk_pilot_user_id, slot: slotDto(slotById.get(b.fk_slot_id)!) })),
        ),
        getWeatherForSlots(user.ownerId, slots.filter((x) => x.is_active).map((x) => ({ id: x.slot_id, groupId: x.fk_slot_group_id, date: dateStr(x.slot_date), start: x.start_time, end: x.end_time }))),
        getPilotFlights(user.ownerId, bookings.filter((b) => b.status !== 'REJECTED').map((b) => b.fk_pilot_user_id)),
        getPilotProfiles(user.ownerId, bookings.filter((b) => b.status !== 'REJECTED').map((b) => b.fk_pilot_user_id)),
      ])
    : [new Map<string, string>(), null, new Map<number, PilotFlight>(), new Map<number, PilotProfileBase>()];

  // What each pilot asked for in this slot group: every request except slots the OPM assigned directly.
  const applied = new Map<number, { all: number; weekend: number }>();
  if (manager) {
    for (const b of bookings) {
      const slot = slotById.get(b.fk_slot_id);
      if (!slot || b.decision_note === ASSIGNED_NOTE) continue;
      const a = applied.get(b.fk_pilot_user_id) ?? { all: 0, weekend: 0 };
      a.all++;
      if (isWeekend(dateStr(slot.slot_date))) a.weekend++;
      applied.set(b.fk_pilot_user_id, a);
    }
  }

  const mappedBookings: Booking[] = bookings.map((b) => {
    const own = b.fk_pilot_user_id === user.userId;
    // Pilots only see their own request in detail; others are anonymised (needed to show "Taken" on blocked slots).
    const visible = manager || own;
    // Who is assigned to a slot is public to everyone who can see the group (shown on the calendar);
    // other pilots' pending requests, notes and documents stay private.
    const named = visible || b.status === 'APPROVED';
    return {
      id: b.booking_id,
      slotId: b.fk_slot_id,
      groupId: b.fk_slot_group_id,
      picId: named ? b.fk_pilot_user_id : -1,
      picName: named ? (pilotNames.get(b.fk_pilot_user_id) ?? 'Pilot') : 'Another pilot',
      status: b.status as Booking['status'],
      requestedAt: b.requested_at.toISOString(),
      assignedByOpm: b.decision_note === ASSIGNED_NOTE,
      decidedAt: visible ? (b.decided_at?.toISOString() ?? null) : null,
      note: visible ? b.decision_note : null,
      pdfName: visible ? b.pdf_file_name : null,
      ...(manager && flights.has(b.fk_pilot_user_id) ? { flight: flights.get(b.fk_pilot_user_id) } : {}),
      ...(manager && profiles.has(b.fk_pilot_user_id)
        ? {
            profile: {
              ...profiles.get(b.fk_pilot_user_id)!,
              appliedInGroup: applied.get(b.fk_pilot_user_id)?.all ?? 0,
              appliedWeekendInGroup: applied.get(b.fk_pilot_user_id)?.weekend ?? 0,
            },
          }
        : {}),
      ...(manager && b.status === 'PENDING' ? { collision: collisions.get(collisionKey(b.fk_pilot_user_id, b.fk_slot_id)) ?? null } : {}),
    };
  });

  return {
    group: mapGroup(g, g.created_by ? (names.get(g.created_by) ?? null) : null, undefined, metas.get(g.slot_group_id)),
    slots: slots.map(
      (s): Slot => ({
        id: s.slot_id,
        groupId: s.fk_slot_group_id,
        date: dateStr(s.slot_date),
        start: s.start_time,
        end: s.end_time,
        active: s.is_active,
      }),
    ),
    bookings: mappedBookings,
    ...(forecast ? { weather: forecast.weather as Record<number, SlotWeather>, weatherNote: forecast.note } : {}),
  };
}

/** Dates (yyyy-MM-dd) among `dates` that already contain slots in any of the company's groups. */
export async function findConflictDates(ownerId: number, dates: string[], clientId: number | null = null): Promise<string[]> {
  if (!dates.length) return [];
  const rows = await prisma.slot.findMany({
    where: { slot_date: { in: dates.map(toDate) }, slot_group: { fk_owner_id: ownerId, fk_client_id: clientId } },
    select: { slot_date: true },
    distinct: ['slot_date'],
    orderBy: { slot_date: 'asc' },
  });
  return rows.map((r) => dateStr(r.slot_date));
}

function validateNewGroup(input: NewSlotGroupInput) {
  if (!SLOT_DATE_RE.test(input.startDate)) throw new SlotBookingError('Invalid start date');
  if (input.startDate < todayIso()) throw new SlotBookingError('Start date cannot be in the past');
  if (input.mode === 'HOURLY' && input.hourEnd <= input.hourStart) throw new SlotBookingError('Hourly end time must be after start time');
  if (!input.approvalDays.length) throw new SlotBookingError('Select at least one approval day');
  if (!input.slots.length) throw new SlotBookingError('Activate at least one slot before publishing');
  if (input.publishAt) {
    const why = scheduleError(input.publishAt);
    if (why) throw new SlotBookingError(why, 400, { field: 'publishAt' });
    // Opening a group after its own slots have passed makes no sense (± a day for timezones).
    const lastSlotDate = input.slots.map((s) => s.date).sort().pop()!;
    if (Date.parse(input.publishAt) > Date.parse(`${lastSlotDate}T23:59:59Z`) + 14 * 3_600_000) {
      throw new SlotBookingError('The publish time must be on or before the last slot day', 400, { field: 'publishAt' });
    }
  }

  const dates = new Set(groupDates(input.startDate, input.rangeMode));
  const blocks = new Set(timeBlocks(input.mode, input.hourStart, input.hourEnd).map(([s, e]) => `${s}|${e}`));
  const seen = new Set<string>();
  for (const s of input.slots) {
    const key = `${s.date}|${s.start}|${s.end}`;
    if (!dates.has(s.date) || !blocks.has(`${s.start}|${s.end}`)) throw new SlotBookingError('Slots do not match the selected parameters');
    if (seen.has(key)) throw new SlotBookingError('Duplicate slots submitted');
    seen.add(key);
  }
}

export async function createGroup(user: SessionUser, input: NewSlotGroupInput): Promise<{ groupId: number; created: number; skipped: number }> {
  assertManager(user);
  validateNewGroup(input);

  // Group names are unique per company (ignoring case and surrounding spaces).
  const groupName = input.name.trim();
  const sameName = await prisma.slot_group.findFirst({
    where: { fk_owner_id: user.ownerId, name: { equals: groupName, mode: 'insensitive' } },
    select: { slot_group_id: true },
  });
  if (sameName) throw new SlotBookingError('A slot group with this name already exists', 409, { field: 'name' });

  if (input.clientId != null) {
    const client = await prisma.client.findFirst({ where: { client_id: input.clientId, fk_owner_id: user.ownerId }, select: { client_id: true } });
    if (!client) throw new SlotBookingError('The selected client was not found', 400, { field: 'clientId' });
  }
  // The system belongs to the chosen client; its location is where the slot weather is forecast.
  if (input.systemId != null) {
    const tool = await prisma.tool.findFirst({
      where: { tool_id: input.systemId, fk_owner_id: user.ownerId, tool_active: 'Y' },
      select: { tool_id: true, assigned_client_id: true, tool_metadata: true },
    });
    if (!tool || input.clientId == null || toolClientId(tool) !== input.clientId) throw new SlotBookingError('The selected system was not found for this client', 400, { field: 'systemId' });
  }
  const pilotGroupIds = [...new Set(input.pilotGroupIds ?? [])];
  if (pilotGroupIds.length) {
    const found = await prisma.pilot_group.findMany({
      where: { pilot_group_id: { in: pilotGroupIds }, fk_owner_id: user.ownerId },
      select: { pilot_group_id: true },
    });
    if (found.length !== pilotGroupIds.length) throw new SlotBookingError('Some selected pilot groups were not found', 400, { field: 'pilotGroupIds' });
  }

  const slotDates = [...new Set(input.slots.map((s) => s.date))];
  // Duplicates are per client: another client's groups may use the same dates and times.
  const clientScope = input.clientId ?? null;
  const conflicts = await findConflictDates(user.ownerId, slotDates, clientScope);
  if (conflicts.length && input.resolution === 'none') {
    throw new SlotBookingError('Slots already exist for one or more selected dates', 409, { conflicts });
  }

  // Pilots whose bookings get cancelled by an overwrite (notified after commit).
  let cancelled: Array<{ pilotId: number; label: string }> = [];

  const result = await prisma.$transaction(async (tx) => {
    let toCreate = input.slots;

    if (conflicts.length && input.resolution === 'overwrite') {
      const doomed = await tx.slot.findMany({
        where: { slot_date: { in: conflicts.map(toDate) }, slot_group: { fk_owner_id: user.ownerId, fk_client_id: clientScope } },
        select: { slot_id: true, slot_date: true, start_time: true, end_time: true },
      });
      // Queried directly: Prisma models slot -> slot_booking as one-to-one (partial unique index), but a slot has many requests.
      const liveBookings = await tx.slot_booking.findMany({
        where: { fk_slot_id: { in: doomed.map((s) => s.slot_id) }, status: { not: 'REJECTED' } },
        select: { fk_slot_id: true, fk_pilot_user_id: true },
      });
      const slotById = new Map(doomed.map((s) => [s.slot_id, s]));
      cancelled = liveBookings.map((b) => {
        const s = slotById.get(b.fk_slot_id)!;
        return { pilotId: b.fk_pilot_user_id, label: `${prettyDate(dateStr(s.slot_date))} ${slotLabel({ start: s.start_time, end: s.end_time })}` };
      });
      await tx.slot.deleteMany({ where: { slot_id: { in: doomed.map((s) => s.slot_id) } } });
    } else if (conflicts.length && input.resolution === 'merge') {
      const existing = await tx.slot.findMany({
        where: { slot_date: { in: conflicts.map(toDate) }, slot_group: { fk_owner_id: user.ownerId, fk_client_id: clientScope } },
        select: { slot_date: true, start_time: true, end_time: true },
      });
      const taken = new Set(existing.map((s) => `${dateStr(s.slot_date)}|${s.start_time}|${s.end_time}`));
      toCreate = input.slots.filter((s) => !taken.has(`${s.date}|${s.start}|${s.end}`));
    }

    const group = await tx.slot_group.create({
      data: {
        fk_owner_id: user.ownerId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        slot_mode: input.mode,
        hour_start: input.hourStart,
        hour_end: input.hourEnd,
        range_mode: input.rangeMode,
        start_date: toDate(input.startDate),
        is_blocked: input.blocked,
        approval_days: [...new Set(input.approvalDays)].sort(),
        created_by: user.userId,
        fk_client_id: input.clientId ?? null,
        fk_tool_id: input.systemId ?? null,
        publish_at: input.publishAt ? new Date(input.publishAt) : null,
      },
    });
    if (pilotGroupIds.length) {
      await tx.slot_group_pilot_group.createMany({
        data: pilotGroupIds.map((fk_pilot_group_id) => ({ fk_slot_group_id: group.slot_group_id, fk_pilot_group_id })),
      });
    }
    if (toCreate.length) {
      await tx.slot.createMany({
        data: toCreate.map((s) => ({
          fk_slot_group_id: group.slot_group_id,
          slot_date: toDate(s.date),
          start_time: s.start,
          end_time: s.end,
        })),
      });
    }
    return { groupId: group.slot_group_id, created: toCreate.length, skipped: input.slots.length - toCreate.length };
  }).catch((e: unknown) => {
    if ((e as { code?: string })?.code === 'P2002') {
      throw new SlotBookingError('A slot group with this name already exists', 409, { field: 'name' });
    }
    throw e;
  });

  audit(user, 'CREATE', 'slot_group', result.groupId,
    `Published slot group “${input.name.trim()}” (${result.created} slots${conflicts.length ? `, conflicts: ${input.resolution}` : ''})`,
    {
      group_id: result.groupId,
      group_name: input.name.trim(),
      mode: input.mode,
      range: input.rangeMode,
      start_date: input.startDate,
      blocked: input.blocked,
      approval_days: input.approvalDays,
      slots_created: result.created,
      slots_skipped: result.skipped,
      conflict_dates: conflicts,
      resolution: conflicts.length ? input.resolution : null,
      client_id: input.clientId ?? null,
      system_id: input.systemId ?? null,
      publish_at: input.publishAt ?? null,
      pilot_group_ids: pilotGroupIds,
    });

  for (const pilotId of [...new Set(cancelled.map((c) => c.pilotId))]) {
    const labels = cancelled.filter((c) => c.pilotId === pilotId).map((c) => c.label).join(', ');
    void notify(user.ownerId, await pilotTarget(pilotId), 'Slot booking cancelled', `Your booking (${labels}) was cancelled because the OPM replaced the slots on that date.`, { warning: true });
  }

  return result;
}

export async function deleteGroup(user: SessionUser, groupId: number): Promise<void> {
  assertManager(user);
  const g = await getOwnedGroup(user, groupId);
  // Read before deleting: the delete cascades to the slots and their bookings.
  const live = await prisma.slot_booking.findMany({
    where: { fk_slot_group_id: groupId, status: { not: 'REJECTED' } },
    select: { fk_pilot_user_id: true, status: true, slot: { select: { slot_date: true, start_time: true, end_time: true } } },
    orderBy: { fk_slot_id: 'asc' },
  });
  await prisma.slot_group.delete({ where: { slot_group_id: groupId } });

  audit(user, 'DELETE', 'slot_group', groupId, `Deleted slot group “${g.name}”`, {
    group_id: groupId,
    group_name: g.name,
    bookings_removed: live.length,
    pilots_notified: [...new Set(live.map((l) => l.fk_pilot_user_id))],
  });

  // One warning per pilot listing every slot they had requested in the group.
  const MAX_LISTED = 5;
  for (const pilotId of [...new Set(live.map((l) => l.fk_pilot_user_id))]) {
    const mine = live
      .filter((l) => l.fk_pilot_user_id === pilotId)
      .map((l) => `${prettyDate(dateStr(l.slot.slot_date))} ${slotLabel({ start: l.slot.start_time, end: l.slot.end_time })}${l.status === 'APPROVED' ? ' (approved)' : ''}`);
    const listed = mine.slice(0, MAX_LISTED).join('; ') + (mine.length > MAX_LISTED ? `; +${mine.length - MAX_LISTED} more` : '');
    void notify(
      user.ownerId,
      await pilotTarget(pilotId),
      'Slot group deleted',
      `The slot group “${g.name}” was deleted by the OPM. Your ${mine.length} slot request${mine.length === 1 ? '' : 's'} in it ${mine.length === 1 ? 'was' : 'were'} cancelled: ${listed}.`,
      { warning: true, data: { group_name: g.name, cancelled_slots: mine.length } },
    );
  }
}

// ───────────────────────── Slot editing ─────────────────────────

export async function editSlot(
  user: SessionUser,
  slotId: number,
  patch: { start: string; end: string; active: boolean },
  reason: string,
): Promise<void> {
  assertManager(user);
  if (!SLOT_TIME_RE.test(patch.start) || !SLOT_TIME_RE.test(patch.end)) throw new SlotBookingError('Invalid time');
  if (!reason.trim()) throw new SlotBookingError('A reason is required for changes');

  const slot = await getOwnedSlot(user, slotId);
  const changes: string[] = [];
  if (slot.start_time !== patch.start || slot.end_time !== patch.end) {
    changes.push(`time ${slot.start_time}–${slot.end_time} → ${patch.start}–${patch.end}`);
  }
  if (slot.is_active !== patch.active) changes.push(patch.active ? 'enabled' : 'disabled');
  if (!changes.length) return;

  // Two slots of the same date must not share the same window.
  const clash = await prisma.slot.findFirst({
    where: {
      fk_slot_group_id: slot.fk_slot_group_id,
      slot_date: slot.slot_date,
      start_time: patch.start,
      end_time: patch.end,
      NOT: { slot_id: slotId },
    },
    select: { slot_id: true },
  });
  if (clash) throw new SlotBookingError('Another slot on this date already uses that time window', 409);

  await prisma.slot.update({
    where: { slot_id: slotId },
    data: { start_time: patch.start, end_time: patch.end, is_active: patch.active, updated_at: new Date() },
  });

  const date = dateStr(slot.slot_date);
  audit(user, 'UPDATE', 'slot', slotId,
    `Edited slot ${prettyDate(date)} ${slotLabel({ start: slot.start_time, end: slot.end_time })} in “${slot.slot_group.name}”: ${changes.join(', ')} — “${reason.trim()}”`,
    {
      group_id: slot.fk_slot_group_id,
      group_name: slot.slot_group.name,
      slot_id: slotId,
      date,
      before: { start: slot.start_time, end: slot.end_time, active: slot.is_active },
      after: patch,
      reason: reason.trim(),
    });

  const live = await prisma.slot_booking.findMany({
    where: { fk_slot_id: slotId, status: { not: 'REJECTED' } },
    select: { fk_pilot_user_id: true },
  });
  for (const pilotId of live.map((l) => l.fk_pilot_user_id)) {
    void notify(user.ownerId, await pilotTarget(pilotId), 'Slot changed by OPM',
      `The slot on ${prettyDate(date)} you requested was changed (${changes.join(', ')}). Reason: ${reason.trim()}`);
  }
}

// ───────────────────────── Bookings ─────────────────────────

export async function requestBooking(user: SessionUser, slotId: number): Promise<{ reviewDay: string }> {
  assertBooker(user);
  const slot = await getOwnedSlot(user, slotId);
  // Hidden (not yet published / offered to other pilot groups) groups look like they do not exist.
  await assertGroupVisible(user, slot.slot_group);
  const date = dateStr(slot.slot_date);
  if (!slot.is_active) throw new SlotBookingError('This slot is not open', 409);
  if (date < todayIso()) throw new SlotBookingError('This slot is in the past', 409);

  const clash = (await findCollisions(user.ownerId, [{ pilotId: user.userId, slot: { slotId, date, start: slot.start_time, end: slot.end_time } }])).get(collisionKey(user.userId, slotId));
  if (clash) throw new SlotBookingError(`You are already assigned to an overlapping slot: ${clash}`, 409, { collision: clash });

  const booking = await prisma.$transaction(async (tx) => {
    // Serialise concurrent requests on the same slot so a blocked slot can't be double-booked.
    await tx.$queryRaw`SELECT slot_id FROM public.slot WHERE slot_id = ${slotId} FOR UPDATE`;
    const live = await tx.slot_booking.findMany({
      where: { fk_slot_id: slotId, status: { not: 'REJECTED' } },
      select: { fk_pilot_user_id: true, status: true },
    });
    if (live.some((b) => b.fk_pilot_user_id === user.userId)) throw new SlotBookingError('You already requested this slot', 409);
    if (live.some((b) => b.status === 'APPROVED')) throw new SlotBookingError('This slot has already been assigned', 409);
    if (slot.slot_group.is_blocked && live.length > 0) throw new SlotBookingError('This slot is already taken', 409);
    return tx.slot_booking.create({
      data: { fk_slot_id: slotId, fk_slot_group_id: slot.fk_slot_group_id, fk_pilot_user_id: user.userId, status: 'PENDING' },
    });
  });

  const label = `${slotLabel({ start: slot.start_time, end: slot.end_time })} on ${prettyDate(date)}`;
  const reviewDay = nextApprovalDay(slot.slot_group.approval_days)?.label ?? approvalDaysLabel(slot.slot_group.approval_days);

  audit(user, 'CREATE', 'slot_booking', booking.booking_id,
    `${user.fullname} requested ${label} in “${slot.slot_group.name}”`,
    { group_id: slot.fk_slot_group_id, group_name: slot.slot_group.name, slot_id: slotId, booking_id: booking.booking_id, date, pilot_id: user.userId });

  void notify(user.ownerId, await managerTargets(user.ownerId), 'New slot request', `${user.fullname} requested ${label} in “${slot.slot_group.name}”.`);
  void notify(user.ownerId, [{ userId: user.userId, email: user.email }], 'Booking requested — pending approval',
    `Your request for ${label} is pending OPM approval. Scheduled review day: ${reviewDay}.`);

  return { reviewDay };
}

/** Pilots cannot change a request in the last 24/48 h (company setting) before the group's approval day. */
async function assertNotLocked(ownerId: number, approvalDays: number[]) {
  const hours = await getLockHours(ownerId);
  const lock = modificationLock(approvalDays, hours);
  if (lock.locked) {
    throw new SlotBookingError(
      `Requests can no longer be changed: they are locked ${hours} hours before the approval day`,
      409,
      { locked: true, approvalAt: lock.approvalAt },
    );
  }
}

/** Moves a pending request to another open slot of the same group (subject to the same lock as cancelling). */
export async function moveBooking(user: SessionUser, bookingId: number, newSlotId: number): Promise<void> {
  assertBooker(user);
  const b = await prisma.slot_booking.findFirst({
    where: { booking_id: bookingId, fk_pilot_user_id: user.userId, slot: { slot_group: { fk_owner_id: user.ownerId } } },
    include: { slot: { include: { slot_group: true } } },
  });
  if (!b) throw new SlotBookingError('Booking not found', 404);
  if (b.status !== 'PENDING') throw new SlotBookingError('Only pending requests can be moved', 409);
  if (b.fk_slot_id === newSlotId) throw new SlotBookingError('Choose a different slot', 400);
  await assertNotLocked(user.ownerId, b.slot.slot_group.approval_days);

  const target = await getOwnedSlot(user, newSlotId);
  if (target.fk_slot_group_id !== b.fk_slot_group_id) throw new SlotBookingError('A request can only be moved within the same slot group', 400);
  const targetDate = dateStr(target.slot_date);
  if (!target.is_active) throw new SlotBookingError('This slot is not open', 409);
  if (targetDate < todayIso()) throw new SlotBookingError('This slot is in the past', 409);
  const clash = (await findCollisions(user.ownerId, [{ pilotId: user.userId, slot: { slotId: newSlotId, date: targetDate, start: target.start_time, end: target.end_time } }])).get(collisionKey(user.userId, newSlotId));
  if (clash) throw new SlotBookingError(`You are already assigned to an overlapping slot: ${clash}`, 409, { collision: clash });

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT slot_id FROM public.slot WHERE slot_id = ${newSlotId} FOR UPDATE`;
    const live = await tx.slot_booking.findMany({
      where: { fk_slot_id: newSlotId, status: { not: 'REJECTED' } },
      select: { fk_pilot_user_id: true, status: true },
    });
    if (live.some((x) => x.fk_pilot_user_id === user.userId)) throw new SlotBookingError('You already requested this slot', 409);
    if (live.some((x) => x.status === 'APPROVED')) throw new SlotBookingError('This slot has already been assigned', 409);
    if (target.slot_group.is_blocked && live.length > 0) throw new SlotBookingError('This slot is already taken', 409);
    const fresh = await tx.slot_booking.findUnique({ where: { booking_id: bookingId } });
    if (!fresh || fresh.status !== 'PENDING') throw new SlotBookingError('This request is no longer pending', 409);
    await tx.slot_booking.update({ where: { booking_id: bookingId }, data: { fk_slot_id: newSlotId, requested_at: new Date() } });
  });

  const from = `${prettyDate(dateStr(b.slot.slot_date))} ${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })}`;
  const to = `${prettyDate(targetDate)} ${slotLabel({ start: target.start_time, end: target.end_time })}`;
  audit(user, 'UPDATE', 'slot_booking', bookingId,
    `${user.fullname} moved the request from ${from} to ${to} in “${target.slot_group.name}”`,
    { group_id: b.fk_slot_group_id, group_name: target.slot_group.name, booking_id: bookingId, from_slot_id: b.fk_slot_id, slot_id: newSlotId, date: targetDate, pilot_id: user.userId });
  void notify(user.ownerId, await managerTargets(user.ownerId), 'Slot request moved', `${user.fullname} moved a request from ${from} to ${to} in “${target.slot_group.name}”.`);
}

export async function cancelBooking(user: SessionUser, bookingId: number): Promise<void> {
  assertBooker(user);
  const b = await prisma.slot_booking.findFirst({
    where: { booking_id: bookingId, fk_pilot_user_id: user.userId, slot: { slot_group: { fk_owner_id: user.ownerId } } },
    include: { slot: { include: { slot_group: true } } },
  });
  if (!b) throw new SlotBookingError('Booking not found', 404);
  if (b.status !== 'PENDING') throw new SlotBookingError('Only pending requests can be cancelled', 409);
  await assertNotLocked(user.ownerId, b.slot.slot_group.approval_days);
  await prisma.slot_booking.delete({ where: { booking_id: bookingId } });

  const date = dateStr(b.slot.slot_date);
  audit(user, 'DELETE', 'slot_booking', bookingId,
    `${user.fullname} cancelled the request for ${prettyDate(date)} ${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} in “${b.slot.slot_group.name}”`,
    { group_id: b.fk_slot_group_id, group_name: b.slot.slot_group.name, slot_id: b.fk_slot_id, booking_id: bookingId, date, pilot_id: user.userId });
}

async function getManagedBooking(user: SessionUser, bookingId: number) {
  const b = await prisma.slot_booking.findFirst({
    where: { booking_id: bookingId, slot: { slot_group: { fk_owner_id: user.ownerId } } },
    include: { slot: { include: { slot_group: true } } },
  });
  if (!b) throw new SlotBookingError('Booking not found', 404);
  return b;
}

export async function approveBooking(
  user: SessionUser,
  bookingId: number,
  pdf?: { fileKey: string; fileName: string } | null,
): Promise<void> {
  assertManager(user);
  if (pdf) {
    const prefix = pdfKeyPrefix(user);
    if (!pdf.fileKey.startsWith(prefix) || pdf.fileKey.includes('..')) throw new SlotBookingError('Invalid attachment key', 403);
  }
  const b = await getManagedBooking(user, bookingId);
  const date = dateStr(b.slot.slot_date);
  const label = `${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} on ${prettyDate(date)}`;

  const clash = (await findCollisions(user.ownerId, [{ pilotId: b.fk_pilot_user_id, slot: { slotId: b.fk_slot_id, date, start: b.slot.start_time, end: b.slot.end_time } }])).get(collisionKey(b.fk_pilot_user_id, b.fk_slot_id));
  if (clash) {
    const who = (await userNames([b.fk_pilot_user_id])).get(b.fk_pilot_user_id) ?? 'This pilot';
    throw new SlotBookingError(`${who} is already assigned to an overlapping slot: ${clash}`, 409, { collision: clash });
  }

  const declined = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT slot_id FROM public.slot WHERE slot_id = ${b.fk_slot_id} FOR UPDATE`;
    const fresh = await tx.slot_booking.findUnique({ where: { booking_id: bookingId } });
    if (!fresh || fresh.status !== 'PENDING') throw new SlotBookingError('This request is no longer pending', 409);
    const already = await tx.slot_booking.findFirst({ where: { fk_slot_id: b.fk_slot_id, status: 'APPROVED' }, select: { booking_id: true } });
    if (already) throw new SlotBookingError('Another pilot has already been approved for this slot', 409);

    const now = new Date();
    await tx.slot_booking.update({
      where: { booking_id: bookingId },
      data: { status: 'APPROVED', decided_at: now, decided_by: user.userId, pdf_file_key: pdf?.fileKey ?? null, pdf_file_name: pdf?.fileName ?? null },
    });
    const others = await tx.slot_booking.findMany({
      where: { fk_slot_id: b.fk_slot_id, status: 'PENDING', NOT: { booking_id: bookingId } },
      select: { booking_id: true, fk_pilot_user_id: true },
    });
    if (others.length) {
      await tx.slot_booking.updateMany({
        where: { booking_id: { in: others.map((o) => o.booking_id) } },
        data: { status: 'REJECTED', decided_at: now, decided_by: user.userId, decision_note: 'Another pilot was selected' },
      });
    }
    return others;
  });

  const names = await userNames([b.fk_pilot_user_id, ...declined.map((d) => d.fk_pilot_user_id)]);
  const pilotName = names.get(b.fk_pilot_user_id) ?? 'Pilot';

  audit(user, 'UPDATE', 'slot_booking', bookingId,
    `Approved ${pilotName} for ${prettyDate(date)} ${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} in “${b.slot.slot_group.name}”${pdf ? ` (attached ${pdf.fileName})` : ''}`,
    {
      group_id: b.fk_slot_group_id, group_name: b.slot.slot_group.name, slot_id: b.fk_slot_id, booking_id: bookingId, date,
      decision: 'APPROVED', pilot_id: b.fk_pilot_user_id, pilot_name: pilotName, attachment: pdf?.fileName ?? null,
      auto_declined: declined.map((d) => d.fk_pilot_user_id),
    });

  void notify(user.ownerId, await pilotTarget(b.fk_pilot_user_id), 'Slot approved',
    `Your request for ${label} in “${b.slot.slot_group.name}” was approved.${pdf ? ' The approval document is attached.' : ''}`, { attachment: pdf });
  for (const d of declined) {
    void notify(user.ownerId, await pilotTarget(d.fk_pilot_user_id), 'Slot request declined', `Your request for ${label} was not selected.`);
  }
}

export async function rejectBooking(user: SessionUser, bookingId: number, note?: string): Promise<void> {
  assertManager(user);
  const b = await getManagedBooking(user, bookingId);
  if (b.status !== 'PENDING') throw new SlotBookingError('This request is no longer pending', 409);

  await prisma.slot_booking.update({
    where: { booking_id: bookingId },
    data: { status: 'REJECTED', decided_at: new Date(), decided_by: user.userId, decision_note: note?.trim() || null },
  });

  const date = dateStr(b.slot.slot_date);
  const label = `${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} on ${prettyDate(date)}`;
  const pilotName = (await userNames([b.fk_pilot_user_id])).get(b.fk_pilot_user_id) ?? 'Pilot';

  audit(user, 'UPDATE', 'slot_booking', bookingId,
    `Rejected ${pilotName} for ${prettyDate(date)} ${slotLabel({ start: b.slot.start_time, end: b.slot.end_time })} in “${b.slot.slot_group.name}”${note?.trim() ? ` — “${note.trim()}”` : ''}`,
    {
      group_id: b.fk_slot_group_id, group_name: b.slot.slot_group.name, slot_id: b.fk_slot_id, booking_id: bookingId, date,
      decision: 'REJECTED', pilot_id: b.fk_pilot_user_id, pilot_name: pilotName, reason: note?.trim() || null,
    });

  void notify(user.ownerId, await pilotTarget(b.fk_pilot_user_id), 'Slot request rejected',
    `Your request for ${label} in “${b.slot.slot_group.name}” was rejected.${note?.trim() ? ` Reason: ${note.trim()}` : ''}`);
}

// ───────────────────────── PDF upload / download ─────────────────────────

const pdfKeyPrefix = (user: SessionUser) => `slot-booking/${user.ownerId}/${user.userId}/`;
const sanitizeFileName = (n: string) => n.replace(/[^\w.\-]+/g, '_').slice(0, 120);

export async function createPdfUploadUrl(user: SessionUser, file: { file_name: string; content_type: string; file_size: number }) {
  assertManager(user);
  if (file.content_type !== 'application/pdf') throw new SlotBookingError('Only PDF files are allowed');
  if (file.file_size > PDF_MAX_BYTES) throw new SlotBookingError('PDF exceeds the 10 MB limit', 413);
  const file_key = `${pdfKeyPrefix(user)}${Date.now()}_${sanitizeFileName(file.file_name)}`;
  const upload_url = await getPresignedUploadUrl(file_key, file.content_type, 600);
  return { upload_url, file_key };
}

export async function getDocumentUrl(user: SessionUser, bookingId: number): Promise<{ url: string; file_name: string }> {
  const b = await getManagedBooking(user, bookingId);
  if (!canManageSlots(user) && b.fk_pilot_user_id !== user.userId) throw new SlotBookingError('Booking not found', 404);
  if (!b.pdf_file_key) throw new SlotBookingError('No document attached', 404);
  const url = await getPresignedDownloadUrl(b.pdf_file_key, 900, b.pdf_file_name ?? 'document.pdf', 'attachment');
  return { url, file_name: b.pdf_file_name ?? 'document.pdf' };
}


export async function listApproved(user: SessionUser): Promise<ApprovedSlotRow[]> {
  const manager = canManageSlots(user);
  const rows = await prisma.slot_booking.findMany({
    where: {
      status: 'APPROVED',
      slot: { slot_group: { fk_owner_id: user.ownerId } },
      ...(manager ? {} : { fk_pilot_user_id: user.userId }),
    },
    include: { slot: { include: { slot_group: { select: { slot_group_id: true, name: true } } } } },
    take: 500,
  });
  const names = await userNames(rows.map((r) => r.fk_pilot_user_id));
  return rows
    .map((r) => ({
      bookingId: r.booking_id,
      date: dateStr(r.slot.slot_date),
      start: r.slot.start_time,
      end: r.slot.end_time,
      groupId: r.slot.slot_group.slot_group_id,
      groupName: r.slot.slot_group.name,
      picId: r.fk_pilot_user_id,
      picName: names.get(r.fk_pilot_user_id) ?? 'Pilot',
      decidedAt: r.decided_at?.toISOString() ?? null,
      pdfName: r.pdf_file_name,
    }))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
}

/** The signed-in pilot's own requests (pending / approved / rejected), newest first. */
export async function listMyBookings(user: SessionUser): Promise<MyBookingRow[]> {
  const [rows, lockHours] = await Promise.all([
    prisma.slot_booking.findMany({
      where: { fk_pilot_user_id: user.userId, slot: { slot_group: { fk_owner_id: user.ownerId } } },
      include: { slot: { include: { slot_group: { select: { slot_group_id: true, name: true, approval_days: true } } } } },
      orderBy: { requested_at: 'desc' },
      take: 200,
    }),
    getLockHours(user.ownerId),
  ]);
  return rows.map((r) => {
    const lock = r.status === 'PENDING' ? modificationLock(r.slot.slot_group.approval_days, lockHours) : { locked: false, approvalAt: null };
    return {
    bookingId: r.booking_id,
    date: dateStr(r.slot.slot_date),
    start: r.slot.start_time,
    end: r.slot.end_time,
    groupId: r.slot.slot_group.slot_group_id,
    groupName: r.slot.slot_group.name,
    picId: r.fk_pilot_user_id,
    picName: user.fullname,
    decidedAt: r.decided_at?.toISOString() ?? null,
    pdfName: r.pdf_file_name,
    status: r.status as MyBookingRow['status'],
    requestedAt: r.requested_at.toISOString(),
    assignedByOpm: r.decision_note === ASSIGNED_NOTE,
    note: r.decision_note,
    locked: lock.locked,
    approvalAt: lock.approvalAt,
    };
  });
}

// ───────────────────────── Audit table ─────────────────────────

export async function listAuditLogs(
  user: SessionUser,
  filters: { page: number; pageSize: number; eventType?: string; entityType?: string; groupId?: number; dateFrom?: string; dateTo?: string },
): Promise<{ data: SlotAuditRow[]; total: number; page: number; pageSize: number }> {
  assertManager(user);
  const where: Prisma.audit_logsWhereInput = {
    owner_id: user.ownerId,
    entity_type: filters.entityType && (SLOT_AUDIT_ENTITIES as readonly string[]).includes(filters.entityType)
      ? filters.entityType
      : { in: [...SLOT_AUDIT_ENTITIES] },
    ...(filters.eventType ? { event_type: filters.eventType } : {}),
    ...(filters.groupId ? { metadata: { path: ['group_id'], equals: filters.groupId } } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { created_at: { ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}), ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}) } }
      : {}),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.audit_logs.findMany({ where, orderBy: { created_at: 'desc' }, skip: (filters.page - 1) * filters.pageSize, take: filters.pageSize }),
    prisma.audit_logs.count({ where }),
  ]);
  return {
    data: rows.map((r) => ({
      id: Number(r.id),
      event_type: r.event_type,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      description: r.description,
      user_name: r.user_name,
      user_role: r.user_role,
      metadata: (r.metadata as Record<string, unknown> | null) ?? null,
      created_at: r.created_at.toISOString(),
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

// ───────────────────────── Approval-day reminder (cron) ─────────────────────────

/**
 * Notifies each company's OPM(s) on a configured approval weekday when requests are still pending.
 * Intended to run once a day; returns how many reminders were sent.
 */
export async function sendApprovalDayReminders(now = new Date()): Promise<number> {
  const today = now.toISOString().slice(0, 10);
  const dow = weekdayOf(today);

  const groups = await prisma.slot_group.findMany({
    where: { approval_days: { has: dow } },
    select: { slot_group_id: true, fk_owner_id: true, name: true },
  });
  if (!groups.length) return 0;

  const pending = await prisma.slot_booking.groupBy({
    by: ['fk_slot_group_id'],
    where: { status: 'PENDING', fk_slot_group_id: { in: groups.map((g) => g.slot_group_id) } },
    _count: { _all: true },
  });

  const byOwner = new Map<number, Array<{ name: string; count: number }>>();
  for (const g of groups) {
    const count = pending.find((p) => p.fk_slot_group_id === g.slot_group_id)?._count._all ?? 0;
    if (!count) continue;
    byOwner.set(g.fk_owner_id, [...(byOwner.get(g.fk_owner_id) ?? []), { name: g.name, count }]);
  }

  let sent = 0;
  for (const [ownerId, items] of byOwner) {
    const total = items.reduce((n, i) => n + i.count, 0);
    const detail = items.map((i) => `${i.name} (${i.count})`).join(', ');
    await notify(ownerId, await managerTargets(ownerId), 'Slot approval day reminder',
      `Today is an approval day. ${total} slot request${total === 1 ? '' : 's'} awaiting your decision: ${detail}.`);
    sent++;
  }
  return sent;
}


// ───────────────────────── Scheduled publishing ─────────────────────────

/** Opens a scheduled group to pilots right now. */
export async function publishGroupNow(user: SessionUser, groupId: number): Promise<void> {
  assertManager(user);
  const g = await getOwnedGroup(user, groupId);
  if (isPublished(g.publish_at)) throw new SlotBookingError('This group is already published', 409);
  const now = new Date();
  await prisma.slot_group.update({ where: { slot_group_id: groupId }, data: { publish_at: now, updated_at: now } });
  audit(user, 'UPDATE', 'slot_group', groupId, `Published slot group “${g.name}” ahead of schedule`, {
    group_id: groupId,
    group_name: g.name,
    scheduled_for: g.publish_at?.toISOString() ?? null,
  });
}

/**
 * Tells pilots a scheduled group is now open (once per group). Pilots see a group the moment its time passes whether or
 * not this runs; this only sends the notification. Intended for a cron every few minutes; returns how many groups it announced.
 */
export async function sendPublishNotifications(now = new Date()): Promise<number> {
  const due = await prisma.slot_group.findMany({
    where: { publish_at: { not: null, lte: now }, published_notified_at: null },
    select: { slot_group_id: true, fk_owner_id: true, name: true },
    take: 100,
  });
  let sent = 0;
  for (const g of due) {
    // Claim the group first so two overlapping cron runs cannot both notify.
    const claimed = await prisma.slot_group.updateMany({
      where: { slot_group_id: g.slot_group_id, published_notified_at: null },
      data: { published_notified_at: now },
    });
    if (claimed.count === 0) continue;

    const audience = (await getAudiences([g.slot_group_id])).get(g.slot_group_id) ?? [];
    const memberIds = audience.length ? [...(await getMemberIds(audience))] : null;
    const pilots = await prisma.public_users.findMany({
      where: {
        fk_owner_id: g.fk_owner_id,
        user_active: 'Y',
        ...(memberIds ? { user_id: { in: memberIds } } : { user_role: { in: [...SLOT_BOOKER_ROLES] } }),
      },
      select: { user_id: true, email: true },
    });
    await notify(
      g.fk_owner_id,
      pilots.map((p) => ({ userId: p.user_id, email: p.email })),
      'Slot group open for requests',
      `The slot group “${g.name}” is now open. You can request your slots.`,
    );
    sent++;
  }
  return sent;
}


/** Active clients of the company, for the "client" choice of a slot group. */
export async function listClients(user: SessionUser): Promise<Array<{ id: number; name: string }>> {
  assertManager(user);
  const rows = await prisma.client.findMany({
    where: { fk_owner_id: user.ownerId, client_active: 'Y' },
    select: { client_id: true, client_name: true },
    orderBy: { client_name: 'asc' },
  });
  return rows.map((c) => ({ id: c.client_id, name: c.client_name }));
}

/** A system's client: the assigned client, otherwise the client id kept in its metadata (same rule as the event logbook). */
function toolClientId(t: { assigned_client_id: number | null; tool_metadata: unknown }): number | null {
  if (t.assigned_client_id) return t.assigned_client_id;
  const raw = (t.tool_metadata as { clientId?: unknown } | null)?.clientId;
  const id = Number(raw);
  return raw != null && Number.isInteger(id) && id > 0 ? id : null;
}

/** Active systems that belong to a client, for the "system" choice of a slot group (its location drives the weather). */
export async function listSystems(user: SessionUser): Promise<SlotSystem[]> {
  assertManager(user);
  const rows = await prisma.tool.findMany({
    where: { fk_owner_id: user.ownerId, tool_active: 'Y' },
    select: { tool_id: true, tool_name: true, tool_code: true, tool_metadata: true, location: true, assigned_client_id: true, tool_component: DRONE_SITE_SELECT },
    orderBy: { tool_name: 'asc' },
  });
  return rows
    .map((t) => ({
      id: t.tool_id,
      name: t.tool_name || t.tool_code || `System #${t.tool_id}`,
      clientId: toolClientId(t),
      hasLocation: resolveSystemLocation(t, t.tool_component ?? []) !== null,
    }))
    .filter((t) => t.clientId !== null);
}
