import 'server-only';

import {
  EVENT_ATTACHMENT_ALLOWED_TYPES,
  EVENT_ATTACHMENT_MAX_BYTES,
  EVENT_ATTACHMENT_MAX_FILES,
  EVENT_TYPES,
  type EventAttachmentInput,
  type EventClientInfo,
  type EventDroneComponent,
  type EventDroneOption,
  type EventLogbookFilters,
  type EventLogbookItem,
  type EventMissionOption,
  formatMissionLabel,
} from '@/config/types/event-logbook';
import { FULL_ACCESS_ROLES } from '@/lib/auth/feature-permissions-types';
import { getSessionEffectivePermissions } from '@/lib/auth/feature-permissions';
import type { SessionUser } from '@/lib/auth/server-session';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl, getPresignedUploadUrl } from '@/lib/s3Client';
import { z } from 'zod';

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

  const drones = await prisma.tool.findMany({
    where: { fk_owner_id: user.ownerId, tool_active: 'Y', ...(toolIdFilter ? { tool_id: toolIdFilter } : {}) },
    orderBy: { tool_name: 'asc' },
    select: { tool_id: true, tool_name: true, tool_code: true, assigned_client_id: true },
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
    ...new Set([...missions.map((m) => m.fk_client_id), ...drones.map((d) => d.assigned_client_id)].filter((v): v is number => v != null)),
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
    drones: drones.map(({ assigned_client_id, ...d }) => ({
      ...d,
      drone_components: componentMap.get(d.tool_id) ?? [],
      assigned_client: assigned_client_id ? (clientMap.get(assigned_client_id) ?? null) : null,
    })),
    missions: missions
      .filter((m) => m.fk_tool_id != null && droneIds.has(m.fk_tool_id))
      .map(({ fk_client_id, ...m }) => ({
        ...m,
        scheduled_start: m.scheduled_start?.toISOString() ?? null,
        client: fk_client_id ? (clientMap.get(fk_client_id) ?? null) : null,
      })),
  };
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
  scopeWhere: { fk_owner_id: number; fk_pilot_user_id?: number; fk_client_id?: number },
  filters: EventLogbookFilters,
): Promise<EventLogbookItem[]> {
  const rows = await prisma.pilot_event.findMany({
    where: {
      ...scopeWhere,
      ...(filters.tool_id ? { fk_tool_id: filters.tool_id } : {}),
      ...(filters.mission_id ? { fk_mission_id: filters.mission_id } : {}),
      ...(filters.event_type ? { event_type: filters.event_type } : {}),
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
    event_type: r.event_type,
    takeoff_time: r.takeoff_time.toISOString(),
    created_at: r.created_at.toISOString(),
    pilot_user_id: r.fk_pilot_user_id,
    pilot_name: pilotMap.get(r.fk_pilot_user_id) ?? null,
    tool_id: r.fk_tool_id,
    tool_name: toolMap.get(r.fk_tool_id) ?? null,
    mission_id: r.fk_mission_id,
    mission_name: r.fk_mission_id ? (missionMap.get(r.fk_mission_id) ?? null) : null,
    client_name: r.fk_client_id ? (clientMap.get(r.fk_client_id) ?? null) : null,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    location_label: r.location_label,
    notes: r.notes,
    attachment_count: r._count.pilot_event_attachment,
  }));
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
}

function attachmentKeyPrefix(user: SessionUser): string {
  return `event-logbook/${user.ownerId}/${user.userId}/`;
}

export async function createAttachmentUploadUrl(
  user: SessionUser,
  file: { file_name: string; content_type: string; file_size: number },
) {
  if (!EVENT_ATTACHMENT_ALLOWED_TYPES.includes(file.content_type)) {
    throw new EventLogbookError(`File type not allowed: ${file.content_type}`);
  }
  if (file.file_size > EVENT_ATTACHMENT_MAX_BYTES) {
    throw new EventLogbookError('File exceeds the 100 MB limit', 413);
  }
  const file_key = `${attachmentKeyPrefix(user)}${Date.now()}_${sanitizeFileName(file.file_name)}`;
  const upload_url = await getPresignedUploadUrl(file_key, file.content_type, 600);
  return { upload_url, file_key };
}

export const MAX_NOTIFY_RECIPIENTS = 20;

export const createEventSchema = z.object({
  tool_id: z.number().int().positive(),
  mission_id: z.number().int().positive().nullable().optional(),
  event_type: z.enum(EVENT_TYPES),
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
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export async function createEvent(user: SessionUser, input: CreateEventInput): Promise<{ event_id: number }> {
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
    const tool = await prisma.tool.findUnique({ where: { tool_id: input.tool_id }, select: { assigned_client_id: true } });
    clientId = tool?.assigned_client_id ?? null;
  }

  // Contacts must belong to the same company; their addresses are snapshotted on the event.
  const contactIds = [...new Set(input.notify_contact_ids)];
  const contacts = contactIds.length
    ? await prisma.event_contact.findMany({ where: { fk_owner_id: user.ownerId, contact_id: { in: contactIds } }, select: { email: true } })
    : [];
  if (contacts.length !== contactIds.length) throw new EventLogbookError('Contact not found', 404);
  const notifyEmails = [...new Set(contacts.map((c) => c.email.toLowerCase()))];

  return prisma.pilot_event.create({
    data: {
      fk_owner_id: user.ownerId,
      fk_pilot_user_id: user.userId,
      fk_tool_id: input.tool_id,
      fk_mission_id: input.mission_id ?? null,
      fk_client_id: clientId,
      event_type: input.event_type,
      takeoff_time: new Date(input.takeoff_time),
      latitude: input.latitude,
      longitude: input.longitude,
      location_label: input.location_label ?? null,
      notes: input.notes?.trim() || null,
      notify_emails: notifyEmails,
      pilot_event_attachment: {
        create: input.attachments.map((a) => ({
          file_name: a.file_name,
          file_key: a.file_key,
          file_type: a.file_type,
          file_size: BigInt(a.file_size),
        })),
      },
    },
    select: { event_id: true },
  });
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
