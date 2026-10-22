import 'server-only';

import {
  EVENT_ATTACHMENT_ALLOWED_TYPES,
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_SUPPORT_MEDIA_ALLOWED_TYPES,
  EVENT_SUPPORT_MEDIA_MAX_FILES,
  EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD,
  EVENT_TYPE_CODE_MAX,
  type EventAttachmentInput,
  type EventClientInfo,
  type EventDroneComponent,
  type EventDetail,
  type EventDroneOption,
  type EventLogbookFilters,
  type EventLogbookItem,
  type EventMissionOption,
  type EventMissionStatus,
  formatMissionLabel,
} from '@/config/types/event-logbook';
import { parseWaypoints } from '@/backend/utils/planning-waypoints';
import { FULL_ACCESS_ROLES } from '@/lib/auth/feature-permissions-types';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { deleteFileFromS3, getPresignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3Client';
import { z } from 'zod';
import { eventTypeFallbackLabel, resolveEventType } from './event-type-service';

export class EventLogbookError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * A user is "scoped" (pilot-like) when they cannot manage systems: they only
 * see systems/missions assigned to them and the events they reported
 * themselves. Full-access roles and anyone holding the systems_manage feature
 * see everything in their organization.
 */
export async function isScopedUser(user: SessionUser): Promise<boolean> {
  if (FULL_ACCESS_ROLES.includes(user.role)) return false;
  const perms = await getSessionEffectivePermissions(user);
  return perms.systems_manage == null;
}

function toolClientId(t: { assigned_client_id: number | null; tool_metadata: unknown }): number | null {
  if (t.assigned_client_id) return t.assigned_client_id;
  const raw = (t.tool_metadata as { clientId?: unknown } | null)?.clientId;
  const id = Number(raw);
  return raw != null && Number.isInteger(id) && id > 0 ? id : null;
}

/** Systems (drones) and missions this user is allowed to report an event against. */
export async function getEventOptions(user: SessionUser): Promise<{
  drones: EventDroneOption[];
  missions: EventMissionOption[];
}> {
  const scoped = await isScopedUser(user);

  const missions = await prisma.pilot_mission.findMany({
    where: {
      fk_owner_id: user.ownerId,
      fk_tool_id: { not: null },
      ...(scoped ? { fk_pilot_user_id: user.userId } : {}),
    },
    orderBy: { scheduled_start: { sort: 'desc', nulls: 'last' } },
    take: 500,
    select: {
      pilot_mission_id: true,
      mission_name: true,
      mission_code: true,
      fk_tool_id: true,
      fk_client_id: true,
      scheduled_start: true,
      actual_end: true,
      location: true,
      status_name: true,
      pilot_mission_status: { select: { status_code: true, status_name: true, is_final_status: true } },
      pilot_mission_type: { select: { type_name: true } },
      pilot_mission_category: { select: { category_name: true } },
      planning_logbook: {
        select: { mission_planning_id: true, mission_planning_code: true, mission_planning_desc: true, waypoints: true },
      },
    },
  });

  let toolIdFilter: { in: number[] } | undefined;
  if (scoped) {
    const ids = await prisma.pilot_mission.findMany({
      where: { fk_owner_id: user.ownerId, fk_pilot_user_id: user.userId, fk_tool_id: { not: null } },
      distinct: ['fk_tool_id'],
      select: { fk_tool_id: true },
    });
    toolIdFilter = { in: ids.map((r) => r.fk_tool_id as number) };
  }

  const allTools = await prisma.tool.findMany({
    where: { fk_owner_id: user.ownerId, tool_active: 'Y', ...(toolIdFilter ? { tool_id: toolIdFilter } : {}) },
    orderBy: { tool_name: 'asc' },
    select: { tool_id: true, tool_name: true, tool_code: true, assigned_client_id: true, location: true, tool_metadata: true },
  });
  // The warehouse is a stock placeholder, not a drone; soft-deleted systems are hidden too.
  const drones = allTools.filter((t) => {
    const meta = t.tool_metadata as { is_warehouse?: boolean; deleted?: boolean } | null;
    return meta?.is_warehouse !== true && meta?.deleted !== true;
  });

  // Same rule as mission creation: DRONE components with a serial number, primary one first.
  const components = drones.length
    ? await prisma.tool_component.findMany({
        where: { fk_tool_id: { in: drones.map((d) => d.tool_id) }, component_type: 'DRONE', component_active: 'Y' },
        select: { fk_tool_id: true, component_name: true, component_code: true, serial_number: true, component_metadata: true },
      })
    : [];
  const componentMap = new Map<number, EventDroneComponent[]>();
  for (const c of components) {
    const serial = c.serial_number?.trim();
    if (c.fk_tool_id == null || !serial) continue;
    const entry = { component_name: c.component_name, component_code: c.component_code ?? null, serial_number: serial };
    const list = componentMap.get(c.fk_tool_id) ?? [];
    if ((c.component_metadata as { is_primary?: boolean } | null)?.is_primary === true) list.unshift(entry);
    else list.push(entry);
    componentMap.set(c.fk_tool_id, list);
  }

  // Client details shown on the review step: the mission's client, else the system's assigned client.
  const clientIds = [
    ...new Set([...missions.map((m) => m.fk_client_id), ...drones.map((d) => toolClientId(d))].filter((v): v is number => v != null)),
  ];
  const clientRows = clientIds.length
    ? await prisma.client.findMany({
        where: { client_id: { in: clientIds }, fk_owner_id: user.ownerId },
        select: {
          client_id: true,
          client_name: true,
          client_code: true,
          client_legal_name: true,
          client_email: true,
          client_phone: true,
          client_website: true,
          client_address: true,
          client_city: true,
          client_state: true,
          client_postal_code: true,
          countries: { select: { country_name: true } },
        },
      })
    : [];
  const clientMap = new Map<number, EventClientInfo>(
    clientRows.map((c) => [
      c.client_id,
      {
        client_id: c.client_id,
        client_name: c.client_name,
        client_code: c.client_code,
        legal_name: c.client_legal_name,
        email: c.client_email,
        phone: c.client_phone,
        website: c.client_website,
        address:
          [c.client_address, [c.client_postal_code, c.client_city].filter(Boolean).join(' '), c.client_state, c.countries?.country_name]
            .map((v) => v?.trim())
            .filter(Boolean)
            .join(', ') || null,
      },
    ]),
  );

  const droneIds = new Set(drones.map((d) => d.tool_id));
  return {
    drones: drones.map(({ assigned_client_id: _assigned, location, tool_metadata, ...d }) => {
      const assigned_client_id = toolClientId({ assigned_client_id: _assigned, tool_metadata });
      const meta = (tool_metadata ?? {}) as { latitude?: unknown; longitude?: unknown; pseudo_name?: unknown };
      const lat = Number(meta.latitude);
      const lng = Number(meta.longitude);
      const hasCoords = meta.latitude != null && meta.longitude != null && Number.isFinite(lat) && Number.isFinite(lng);
      return {
        ...d,
        drone_components: componentMap.get(d.tool_id) ?? [],
        assigned_client: assigned_client_id ? (clientMap.get(assigned_client_id) ?? null) : null,
        latitude: hasCoords ? lat : null,
        longitude: hasCoords ? lng : null,
        location_name: (typeof meta.pseudo_name === 'string' && meta.pseudo_name.trim()) || location?.trim() || null,
      };
    }),
    missions: missions
      .filter((m) => m.fk_tool_id != null && droneIds.has(m.fk_tool_id))
      .map(({ fk_client_id, pilot_mission_status, pilot_mission_type, pilot_mission_category, planning_logbook, actual_end: _actualEnd, status_name, ...m }) => {
        const is_active = isMissionActive({ status_name, status: pilot_mission_status });
        const waypoints = planning_logbook ? parseWaypoints(planning_logbook.waypoints) : null;
        return {
          ...m,
          scheduled_start: m.scheduled_start?.toISOString() ?? null,
          client: fk_client_id ? (clientMap.get(fk_client_id) ?? null) : null,
          is_active,
          status_code: normalizeMissionStatus(status_name, pilot_mission_status),
          status_name: status_name?.trim() || pilot_mission_status?.status_name || null,
          operation_type: pilot_mission_type?.type_name ?? null,
          category: pilot_mission_category?.category_name ?? null,
          plan:
            planning_logbook
              ? {
                  plan_id: planning_logbook.mission_planning_id,
                  code: planning_logbook.mission_planning_code,
                  description: planning_logbook.mission_planning_desc,
                  waypoints: (waypoints ?? []).map(({ lat, lng }) => ({ lat, lng })),
                }
              : null,
        };
      }),
  };
}

const STATUS_ALIASES: Record<string, EventMissionStatus> = {
  PLANNED: 'PLANNED', SCHEDULED: 'PLANNED', '00': 'PLANNED', PIANIFICATA: 'PLANNED',
  IN_PROGRESS: 'IN_PROGRESS', IN_FLIGHT: 'IN_PROGRESS', '05': 'IN_PROGRESS', 'IN_ESECUZIONE': 'IN_PROGRESS',
  COMPLETED: 'COMPLETED', COMPLETATA: 'COMPLETED', '10': 'COMPLETED',
  CANCELLED: 'CANCELLED', CANCELED: 'CANCELLED', CANCELLATA: 'CANCELLED',
  ABORTED: 'ABORTED',
};

/** Canonical status (pilot_mission.status_name first, then the joined status) so the UI can label it consistently. */
function normalizeMissionStatus(
  own: string | null,
  joined: { status_code: string; status_name: string } | null,
): EventMissionStatus | null {
  for (const v of [own, joined?.status_code, joined?.status_name]) {
    const hit = STATUS_ALIASES[v?.trim().toUpperCase().replace(/[\s-]+/g, '_') ?? ''];
    if (hit) return hit;
  }
  return null;
}

const FINISHED_STATUS_NAMES = ['COMPLETED', 'COMPLETATA', 'CANCELLED', 'CANCELED', 'CANCELLATA', 'ABORTED'];

/**
 * A mission can still have events reported against it until it is completed, cancelled or aborted.
 * pilot_mission.status_name (PLANNED | IN_PROGRESS | COMPLETED | CANCELLED | ABORTED) is what the app
 * writes and filters by; the joined status table has per-owner ids and is only a fallback.
 */
function isMissionActive(m: {
  status_name: string | null;
  status: { status_code: string; status_name: string; is_final_status: boolean | null } | null;
}): boolean {
  const own = m.status_name?.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (own) return !FINISHED_STATUS_NAMES.includes(own);
  if (m.status?.is_final_status) return false;
  const joined = [m.status?.status_code, m.status?.status_name].map((v) => v?.trim().toUpperCase() ?? '');
  return !joined.some((v) => FINISHED_STATUS_NAMES.includes(v));
}

export async function listEvents(user: SessionUser, filters: EventLogbookFilters): Promise<EventLogbookItem[]> {
  const scoped = await isScopedUser(user);
  return findEvents({ fk_owner_id: user.ownerId, ...(scoped ? { fk_pilot_user_id: user.userId } : {}) }, filters);
}

/** Client-portal view: only events attributed to the user's own client. */
export async function listEventsForClient(
  clientId: number,
  ownerId: number,
  filters: EventLogbookFilters,
): Promise<EventLogbookItem[]> {
  return findEvents({ fk_owner_id: ownerId, fk_client_id: clientId }, filters);
}

async function findEvents(
  scopeWhere: { fk_owner_id: number; fk_pilot_user_id?: number; fk_client_id?: number; event_id?: number },
  filters: EventLogbookFilters,
): Promise<EventLogbookItem[]> {
  const rows = await prisma.pilot_event.findMany({
    where: {
      ...scopeWhere,
      ...(filters.tool_id ? { fk_tool_id: filters.tool_id } : {}),
      ...(filters.mission_id ? { fk_mission_id: filters.mission_id } : {}),
      ...(filters.event_type_id ? { fk_event_type_id: filters.event_type_id } : {}),
      ...(filters.date_start || filters.date_end
        ? {
            takeoff_time: {
              ...(filters.date_start ? { gte: new Date(filters.date_start) } : {}),
              ...(filters.date_end ? { lte: new Date(filters.date_end) } : {}),
            },
          }
        : {}),
    },
    orderBy: { event_id: 'desc' },
    take: 1000,
    include: { _count: { select: { pilot_event_attachment: true } } },
  });

  if (rows.length === 0) return [];

  const [pilots, tools, missions, clients] = await Promise.all([
    prisma.public_users.findMany({
      where: { user_id: { in: [...new Set(rows.map((r) => r.fk_pilot_user_id))] } },
      select: { user_id: true, first_name: true, last_name: true },
    }),
    prisma.tool.findMany({
      where: { tool_id: { in: [...new Set(rows.map((r) => r.fk_tool_id))] } },
      select: { tool_id: true, tool_name: true },
    }),
    prisma.pilot_mission.findMany({
      where: { pilot_mission_id: { in: rows.map((r) => r.fk_mission_id).filter((v): v is number => v != null) } },
      select: { pilot_mission_id: true, mission_name: true, mission_code: true },
    }),
    prisma.client.findMany({
      where: { client_id: { in: rows.map((r) => r.fk_client_id).filter((v): v is number => v != null) } },
      select: { client_id: true, client_name: true },
    }),
  ]);

  const pilotMap = new Map(pilots.map((p) => [p.user_id, [p.first_name, p.last_name].filter(Boolean).join(' ') || null]));
  const toolMap = new Map(tools.map((t) => [t.tool_id, t.tool_name]));
  const missionMap = new Map(missions.map((m) => [m.pilot_mission_id, formatMissionLabel(m, m.pilot_mission_id)]));
  const clientMap = new Map(clients.map((c) => [c.client_id, c.client_name]));

  return rows.map((r) => ({
    event_id: r.event_id,
    event_type_id: r.fk_event_type_id,
    event_type: r.event_type,
    // The label and code the event was reported with; renaming the type later does not change them.
    event_type_label: r.event_type_label ?? eventTypeFallbackLabel(r.event_type),
    takeoff_time: r.takeoff_time.toISOString(),
    created_at: r.created_at.toISOString(),
    pilot_user_id: r.fk_pilot_user_id,
    pilot_name: pilotMap.get(r.fk_pilot_user_id) ?? null,
    tool_id: r.fk_tool_id,
    tool_name: toolMap.get(r.fk_tool_id) ?? null,
    mission_id: r.fk_mission_id,
    mission_name: r.fk_mission_id ? (missionMap.get(r.fk_mission_id) ?? null) : null,
    client_id: r.fk_client_id,
    client_name: r.fk_client_id ? (clientMap.get(r.fk_client_id) ?? null) : null,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    location_label: r.location_label,
    notes: r.notes,
    attachment_count: r._count.pilot_event_attachment,
  }));
}

type EventScope = { fk_owner_id: number; fk_pilot_user_id?: number; fk_client_id?: number };

/** Full details of one event (with attachment links and the mission plan outline). */
async function loadEventDetail(scope: EventScope, eventId: number, canEdit: boolean, includeRecipients: boolean): Promise<EventDetail> {
  const [item] = await findEvents({ ...scope, event_id: eventId }, {});
  if (!item) throw new EventLogbookError('Event not found', 404);

  const row = await prisma.pilot_event.findUnique({
    where: { event_id: eventId },
    select: {
      notify_emails: true,
      fk_mission_id: true,
      tool: { select: { tool_code: true } },
      pilot_event_attachment: { orderBy: { attachment_id: 'asc' } },
    },
  });
  if (!row) throw new EventLogbookError('Event not found', 404);

  const mission = row.fk_mission_id
    ? await prisma.pilot_mission.findUnique({
        where: { pilot_mission_id: row.fk_mission_id },
        select: { planning_logbook: { select: { mission_planning_code: true, waypoints: true } } },
      })
    : null;
  const waypoints = mission?.planning_logbook ? parseWaypoints(mission.planning_logbook.waypoints) : null;

  const attachments = await Promise.all(
    row.pilot_event_attachment.map(async (a) => ({
      attachment_id: a.attachment_id,
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size != null ? Number(a.file_size) : null,
      url: await getPresignedDownloadUrl(a.file_key, 900, a.file_name, 'inline'),
      download_url: await getPresignedDownloadUrl(a.file_key, 900, a.file_name, 'attachment'),
      is_supporting: a.is_supporting,
    })),
  );

  return {
    ...item,
    tool_code: row.tool?.tool_code ?? null,
    notify_emails: includeRecipients ? row.notify_emails : [],
    plan:
      mission?.planning_logbook && waypoints
        ? { code: mission.planning_logbook.mission_planning_code, waypoints: waypoints.map(({ lat, lng }) => ({ lat, lng })) }
        : null,
    attachments,
    can_edit: canEdit,
  };
}

export async function getEventDetail(user: SessionUser, eventId: number, canEdit: boolean): Promise<EventDetail> {
  const scoped = await isScopedUser(user);
  return loadEventDetail({ fk_owner_id: user.ownerId, ...(scoped ? { fk_pilot_user_id: user.userId } : {}) }, eventId, canEdit, true);
}

/** Client portal: read-only, restricted to events attributed to the client. */
export async function getClientEventDetail(clientId: number, ownerId: number, eventId: number): Promise<EventDetail> {
  return loadEventDetail({ fk_owner_id: ownerId, fk_client_id: clientId }, eventId, false, false);
}

const attachmentInputSchema = z.object({
  file_name: z.string().min(1).max(255),
  file_key: z.string().min(1),
  file_type: z.string().max(100),
  file_size: z.number().int().nonnegative().max(EVENT_ATTACHMENT_MAX_BYTES),
});

/** Editable parts of a reported event. System, mission and recipients stay as reported. */
export const updateEventSchema = z
  .object({
    /** Omitted (or equal to the current type) keeps the type, code and label the event was reported with. */
    event_type_id: z.number().int().positive().optional(),
    takeoff_time: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid takeoff time'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    location_label: z.string().max(500).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    remove_attachment_ids: z.array(z.number().int().positive()).default([]),
    add_attachments: z.array(attachmentInputSchema).default([]),
  });
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

function mapSnapshotKey(ownerId: number, eventId: number): string {
  return `event-logbook/${ownerId}/maps/${eventId}.png`;
}
export { mapSnapshotKey };

async function findOwnEvent(user: SessionUser, eventId: number) {
  const scoped = await isScopedUser(user);
  const event = await prisma.pilot_event.findFirst({
    where: { event_id: eventId, fk_owner_id: user.ownerId, ...(scoped ? { fk_pilot_user_id: user.userId } : {}) },
    include: { pilot_event_attachment: true },
  });
  if (!event) throw new EventLogbookError('Event not found', 404);
  return event;
}

/** Edits a reported event. Deliberately sends no notifications: recipients were informed when it was reported. */
export async function updateEvent(user: SessionUser, eventId: number, input: UpdateEventInput): Promise<{ tool_id: number; event_type_label: string }> {
  const event = await findOwnEvent(user, eventId);
  // Keeping the event's current (possibly deleted) type is fine; switching to another must be a live one
  // for the event's client. Switching copies the new type's code and name onto the event (snapshot).
  const switchTo =
    input.event_type_id && input.event_type_id !== event.fk_event_type_id
      ? await resolveEventType(user.ownerId, input.event_type_id, event.fk_client_id)
      : null;

  const removeIds = new Set(input.remove_attachment_ids);
  const removed = event.pilot_event_attachment.filter((a) => removeIds.has(a.attachment_id));
  if (removed.length !== removeIds.size) throw new EventLogbookError('Attachment not found', 404);

  const prefix = attachmentKeyPrefix(user);
  for (const a of input.add_attachments) {
    if (!a.file_key.startsWith(prefix) || a.file_key.includes('..')) throw new EventLogbookError('Invalid attachment key', 403);
    if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(a.file_type)) throw new EventLogbookError(`File type not allowed: ${a.file_type}`);
  }
  const keptOriginal = event.pilot_event_attachment.filter((a) => !a.is_supporting).length - removed.filter((a) => !a.is_supporting).length;
  if (keptOriginal + input.add_attachments.length > EVENT_ATTACHMENT_MAX_FILES) {
    throw new EventLogbookError(`At most ${EVENT_ATTACHMENT_MAX_FILES} attachments are allowed`);
  }

  await prisma.$transaction([
    prisma.pilot_event.update({
      where: { event_id: eventId },
      data: {
        ...(switchTo ? { fk_event_type_id: switchTo.event_type_id, event_type: switchTo.type_code, event_type_label: switchTo.type_name } : {}),
        takeoff_time: new Date(input.takeoff_time),
        latitude: input.latitude,
        longitude: input.longitude,
        location_label: input.location_label ?? null,
        notes: input.notes?.trim() || null,
      },
    }),
    prisma.pilot_event_attachment.deleteMany({ where: { fk_event_id: eventId, attachment_id: { in: [...removeIds] } } }),
    prisma.pilot_event_attachment.createMany({
      data: input.add_attachments.map((a) => ({
        fk_event_id: eventId,
        file_name: a.file_name,
        file_key: a.file_key,
        file_type: a.file_type,
        file_size: BigInt(a.file_size),
      })),
    }),
  ]);

  await removeS3Objects(removed.map((a) => a.file_key));
  return { tool_id: event.fk_tool_id, event_type_label: switchTo?.type_name ?? event.event_type_label ?? eventTypeFallbackLabel(event.event_type) };
}

export async function deleteEvent(user: SessionUser, eventId: number): Promise<{ event_type_label: string; tool_id: number }> {
  const event = await findOwnEvent(user, eventId);
  // Attachment rows and webhook deliveries are removed by the database (ON DELETE CASCADE).
  await prisma.pilot_event.delete({ where: { event_id: eventId } });
  await removeS3Objects([...event.pilot_event_attachment.map((a) => a.file_key), mapSnapshotKey(event.fk_owner_id, eventId)]);
  return { event_type_label: event.event_type_label ?? eventTypeFallbackLabel(event.event_type), tool_id: event.fk_tool_id };
}

/** Human-readable event summary for audit logs, e.g. `"Bird activity" on system "Drone 1"` (no raw ids/codes). */
export async function describeEventForAudit(toolId: number, eventTypeLabel: string): Promise<string> {
  const tool = await prisma.tool.findUnique({ where: { tool_id: toolId }, select: { tool_name: true, tool_code: true } });
  const system = tool?.tool_name?.trim() || tool?.tool_code?.trim();
  return `"${eventTypeLabel}"${system ? ` on system "${system}"` : ''}`;
}

/** Storage clean-up is best effort: a leftover file must not fail an edit or delete that already succeeded. */
async function removeS3Objects(keys: string[]) {
  await Promise.all(
    keys.map((key) =>
      deleteFileFromS3(key).catch((err) => console.error('[event-logbook] could not delete', key, err)),
    ),
  );
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
}

function attachmentKeyPrefix(user: SessionUser): string {
  return `event-logbook/${user.ownerId}/${user.userId}/`;
}

export async function createAttachmentUploadUrl(
  user: SessionUser,
  file: { file_name: string; content_type: string; file_size: number; purpose?: 'attachment' | 'support' },
) {
  const allowed = file.purpose === 'support' ? EVENT_SUPPORT_MEDIA_ALLOWED_TYPES : EVENT_ATTACHMENT_ALLOWED_TYPES;
  if (!allowed.includes(file.content_type)) {
    throw new EventLogbookError(`File type not allowed: ${file.content_type}`);
  }
  if (file.file_size > EVENT_ATTACHMENT_MAX_BYTES) {
    throw new EventLogbookError('File exceeds the 100 MB limit', 413);
  }
  const file_key = `${attachmentKeyPrefix(user)}${Date.now()}_${sanitizeFileName(file.file_name)}`;
  const upload_url = await getPresignedUploadUrl(file_key, file.content_type, 600);
  return { upload_url, file_key };
}

export const addSupportMediaSchema = z.object({
  media: z.array(attachmentInputSchema).min(1).max(EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD),
});
export type AddSupportMediaInput = z.infer<typeof addSupportMediaSchema>;

/**
 * Adds supporting images/videos to an already reported event. Recipients are not emailed again;
 * the caller notifies the client's webhooks (update type `support_media`).
 */
export async function addSupportMedia(
  user: SessionUser,
  eventId: number,
  input: AddSupportMediaInput,
): Promise<{ tool_id: number; event_type_label: string; attachment_ids: number[] }> {
  const event = await findOwnEvent(user, eventId);

  const prefix = attachmentKeyPrefix(user);
  for (const m of input.media) {
    if (!m.file_key.startsWith(prefix) || m.file_key.includes('..')) throw new EventLogbookError('Invalid attachment key', 403);
    if (!EVENT_SUPPORT_MEDIA_ALLOWED_TYPES.includes(m.file_type)) {
      throw new EventLogbookError(`Supporting media must be an image or a video: ${m.file_type}`);
    }
  }
  const existing = event.pilot_event_attachment.filter((a) => a.is_supporting).length;
  if (existing + input.media.length > EVENT_SUPPORT_MEDIA_MAX_FILES) {
    throw new EventLogbookError(`At most ${EVENT_SUPPORT_MEDIA_MAX_FILES} supporting media are allowed per event`);
  }

  const created = await prisma.$transaction(
    input.media.map((m) =>
      prisma.pilot_event_attachment.create({
        data: { fk_event_id: eventId, file_name: m.file_name, file_key: m.file_key, file_type: m.file_type, file_size: BigInt(m.file_size), is_supporting: true },
        select: { attachment_id: true },
      }),
    ),
  );
  return {
    tool_id: event.fk_tool_id,
    event_type_label: event.event_type_label ?? eventTypeFallbackLabel(event.event_type),
    attachment_ids: created.map((c) => c.attachment_id),
  };
}

export const MAX_NOTIFY_RECIPIENTS = 20;

export const createEventSchema = z.object({
  tool_id: z.number().int().positive(),
  mission_id: z.number().int().positive().nullable().optional(),
  /** Unique id of the event type; its code and name are copied onto the event when it is reported. */
  event_type_id: z.number().int().positive(),
  takeoff_time: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid takeoff time'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  location_label: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  /** Contact-book entries emailed about this event. */
  notify_contact_ids: z.array(z.number().int().positive()).max(MAX_NOTIFY_RECIPIENTS).default([]),
  attachments: z
    .array(
      z.object({
        file_name: z.string().min(1).max(255),
        file_key: z.string().min(1),
        file_type: z.string().max(100),
        file_size: z.number().int().nonnegative().max(EVENT_ATTACHMENT_MAX_BYTES),
      }),
    )
    .max(EVENT_ATTACHMENT_MAX_FILES)
    .default([]),
  /** Supporting images/videos added while reporting; saved flagged as supporting media. */
  support_media: z.array(attachmentInputSchema).max(EVENT_SUPPORT_MEDIA_MAX_PER_UPLOAD).default([]),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export async function createEvent(user: SessionUser, input: CreateEventInput): Promise<{ event_id: number; event_type_label: string }> {
  const { drones, missions } = await getEventOptions(user);

  // Server-side scope enforcement: never trust the ids the client sends.
  if (!drones.some((d) => d.tool_id === input.tool_id)) {
    throw new EventLogbookError('System not available for this user', 403);
  }
  if (input.mission_id) {
    const mission = missions.find((m) => m.pilot_mission_id === input.mission_id);
    if (!mission) throw new EventLogbookError('Mission not available for this user', 403);
    if (mission.fk_tool_id !== input.tool_id) {
      throw new EventLogbookError('Mission does not belong to the selected system');
    }
  }

  const prefix = attachmentKeyPrefix(user);
  for (const a of input.attachments as EventAttachmentInput[]) {
    if (!a.file_key.startsWith(prefix) || a.file_key.includes('..')) {
      throw new EventLogbookError('Invalid attachment key', 403);
    }
    if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(a.file_type)) {
      throw new EventLogbookError(`File type not allowed: ${a.file_type}`);
    }
  }

  for (const m of input.support_media) {
    if (!m.file_key.startsWith(prefix) || m.file_key.includes('..')) throw new EventLogbookError('Invalid attachment key', 403);
    if (!EVENT_SUPPORT_MEDIA_ALLOWED_TYPES.includes(m.file_type)) {
      throw new EventLogbookError(`Supporting media must be an image or a video: ${m.file_type}`);
    }
  }

  // The client notified is the mission's client, falling back to the system's assigned client.
  let clientId: number | null = null;
  if (input.mission_id) {
    const m = await prisma.pilot_mission.findUnique({
      where: { pilot_mission_id: input.mission_id },
      select: { fk_client_id: true },
    });
    clientId = m?.fk_client_id ?? null;
  }
  if (!clientId) {
    const tool = await prisma.tool.findUnique({
      where: { tool_id: input.tool_id },
      select: { assigned_client_id: true, tool_metadata: true },
    });
    clientId = tool ? toolClientId(tool) : null;
  }
  if (!clientId) {
    throw new EventLogbookError(
      input.mission_id
        ? 'The selected mission has no client assigned, and neither does the system. Assign a client before reporting an event.'
        : 'The selected system has no client assigned. Choose a mission with a client or assign a client to the system before reporting an event.',
    );
  }

  // Client-specific types only apply to their own client; default types apply everywhere.
  const eventType = await resolveEventType(user.ownerId, input.event_type_id, clientId);

  // Contacts must belong to the same company; their addresses are snapshotted on the event.
  const contactIds = [...new Set(input.notify_contact_ids)];
  const contacts = contactIds.length
    ? await prisma.event_contact.findMany({ where: { fk_owner_id: user.ownerId, contact_id: { in: contactIds } }, select: { email: true } })
    : [];
  if (contacts.length !== contactIds.length) throw new EventLogbookError('Contact not found', 404);
  const notifyEmails = [...new Set(contacts.map((c) => c.email.toLowerCase()))];

  const created = await prisma.pilot_event.create({
    data: {
      fk_owner_id: user.ownerId,
      fk_pilot_user_id: user.userId,
      fk_tool_id: input.tool_id,
      fk_mission_id: input.mission_id ?? null,
      fk_client_id: clientId,
      fk_event_type_id: eventType.event_type_id,
      event_type: eventType.type_code,
      event_type_label: eventType.type_name,
      takeoff_time: new Date(input.takeoff_time),
      latitude: input.latitude,
      longitude: input.longitude,
      location_label: input.location_label ?? null,
      notes: input.notes?.trim() || null,
      notify_emails: notifyEmails,
      pilot_event_attachment: {
        create: [
          ...input.attachments.map((a) => ({
            file_name: a.file_name,
            file_key: a.file_key,
            file_type: a.file_type,
            file_size: BigInt(a.file_size),
          })),
          ...input.support_media.map((a) => ({
            file_name: a.file_name,
            file_key: a.file_key,
            file_type: a.file_type,
            file_size: BigInt(a.file_size),
            is_supporting: true,
          })),
        ],
      },
    },
    select: { event_id: true },
  });
  return { event_id: created.event_id, event_type_label: eventType.type_name };
}

async function presignEventAttachments(where: { event_id: number; fk_owner_id: number; fk_pilot_user_id?: number; fk_client_id?: number }) {
  const event = await prisma.pilot_event.findFirst({
    where,
    include: { pilot_event_attachment: { orderBy: { attachment_id: 'asc' } } },
  });
  if (!event) throw new EventLogbookError('Event not found', 404);

  return Promise.all(
    event.pilot_event_attachment.map(async (a) => ({
      attachment_id: a.attachment_id,
      file_name: a.file_name,
      file_type: a.file_type,
      file_size: a.file_size != null ? Number(a.file_size) : null,
      url: await getPresignedDownloadUrl(a.file_key, 900, a.file_name, 'inline'),
      is_supporting: a.is_supporting,
    })),
  );
}

export async function getEventAttachmentUrls(user: SessionUser, eventId: number) {
  const scoped = await isScopedUser(user);
  return presignEventAttachments({
    event_id: eventId,
    fk_owner_id: user.ownerId,
    ...(scoped ? { fk_pilot_user_id: user.userId } : {}),
  });
}

export async function getClientEventAttachmentUrls(clientId: number, ownerId: number, eventId: number) {
  return presignEventAttachments({ event_id: eventId, fk_owner_id: ownerId, fk_client_id: clientId });
}
