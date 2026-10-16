import 'server-only';

import { EVENT_TYPE_LABELS, type EventType } from '@/config/types/event-logbook';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { z } from 'zod';
import { sendNotificationEmail } from '../../../../lib/resend/mail';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '../email/email-limit-service';
import { EventLogbookError } from './event-logbook-service';

const MAX_EVENT_RECIPIENTS = 20;
// S3 presigned URLs are valid for at most 7 days.
const ATTACHMENT_URL_TTL_S = 7 * 24 * 60 * 60;

const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().max(150).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  email: emailSchema,
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const defaultContactsInputSchema = z.object({
  contact_ids: z.array(z.number().int().positive()).max(MAX_EVENT_RECIPIENTS),
});

const blank = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

// ── Contact book ─────────────────────────────────────────────────────────────

export async function listContacts(ownerId: number) {
  const rows = await prisma.event_contact.findMany({ where: { fk_owner_id: ownerId }, orderBy: { name: 'asc' } });
  return rows.map((r) => ({ contact_id: r.contact_id, name: r.name, company: r.company, notes: r.notes, email: r.email }));
}

async function assertEmailFree(ownerId: number, email: string, exceptId?: number) {
  const clash = await prisma.event_contact.findFirst({
    where: { fk_owner_id: ownerId, email: { equals: email, mode: 'insensitive' }, ...(exceptId ? { NOT: { contact_id: exceptId } } : {}) },
    select: { contact_id: true },
  });
  if (clash) throw new EventLogbookError('A contact with this email already exists', 409);
}

export async function createContact(ownerId: number, userId: number, input: ContactInput) {
  await assertEmailFree(ownerId, input.email);
  const row = await prisma.event_contact.create({
    data: {
      fk_owner_id: ownerId,
      name: input.name,
      company: blank(input.company),
      notes: blank(input.notes),
      email: input.email,
      created_by: userId,
    },
    select: { contact_id: true },
  });
  return row.contact_id;
}

async function getOwnedContact(ownerId: number, contactId: number) {
  const row = await prisma.event_contact.findFirst({ where: { contact_id: contactId, fk_owner_id: ownerId } });
  if (!row) throw new EventLogbookError('Contact not found', 404);
  return row;
}

export async function updateContact(ownerId: number, contactId: number, input: Partial<ContactInput>) {
  await getOwnedContact(ownerId, contactId);
  if (input.email) await assertEmailFree(ownerId, input.email, contactId);
  await prisma.event_contact.update({
    where: { contact_id: contactId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.company !== undefined ? { company: blank(input.company) } : {}),
      ...(input.notes !== undefined ? { notes: blank(input.notes) } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      updated_at: new Date(),
    },
  });
}

export async function deleteContact(ownerId: number, contactId: number) {
  await getOwnedContact(ownerId, contactId);
  await prisma.event_contact.delete({ where: { contact_id: contactId } });
}

export async function sendTestToContact(ownerId: number, contactId: number) {
  const contact = await getOwnedContact(ownerId, contactId);
  if (await isDailyEmailLimitReached(ownerId)) throw new EventLogbookError('Daily email limit reached', 429);
  await sendNotificationEmail(
    [contact.email],
    'ReADI event notification — test',
    `Hello ${contact.name}, this is a test email from the ReADI Event Logbook. You will receive an email like this when you are selected as a recipient of a reported event.`,
    'event_logbook_test',
  );
  await incrementDailyEmailCount(ownerId);
}

// ── Per-client defaults ──────────────────────────────────────────────────────

/** Default contact ids per client, used to pre-fill the recipients of a new event. */
export async function getDefaultContactMap(ownerId: number): Promise<Record<number, number[]>> {
  const rows = await prisma.event_default_contact.findMany({
    where: { fk_owner_id: ownerId },
    orderBy: { default_id: 'asc' },
    select: { fk_client_id: true, fk_contact_id: true },
  });
  const map: Record<number, number[]> = {};
  for (const r of rows) (map[r.fk_client_id] ??= []).push(r.fk_contact_id);
  return map;
}

export async function setClientDefaultContacts(ownerId: number, clientId: number, contactIds: number[]) {
  const client = await prisma.client.findFirst({ where: { client_id: clientId, fk_owner_id: ownerId }, select: { client_id: true } });
  if (!client) throw new EventLogbookError('Client not found', 404);

  const ids = [...new Set(contactIds)];
  if (ids.length) {
    const found = await prisma.event_contact.count({ where: { fk_owner_id: ownerId, contact_id: { in: ids } } });
    if (found !== ids.length) throw new EventLogbookError('Contact not found', 404);
  }

  await prisma.$transaction([
    prisma.event_default_contact.deleteMany({ where: { fk_owner_id: ownerId, fk_client_id: clientId } }),
    prisma.event_default_contact.createMany({
      data: ids.map((contactId) => ({ fk_owner_id: ownerId, fk_client_id: clientId, fk_contact_id: contactId })),
    }),
  ]);
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Emails the recipients chosen for the event when it was reported.
 * Never throws: a mail failure must not affect the pilot's report.
 */
export async function dispatchEventEmails(eventId: number): Promise<void> {
  try {
    const event = await prisma.pilot_event.findUnique({ where: { event_id: eventId }, include: { pilot_event_attachment: true } });
    if (!event) return;

    const recipients = event.notify_emails;
    if (recipients.length === 0) {
      console.log(`[event-email] event #${eventId}: no recipients selected`);
      return;
    }

    if (await isDailyEmailLimitReached(event.fk_owner_id)) {
      console.log('[event-email] Daily email limit reached for owner:', event.fk_owner_id);
      return;
    }

    const [pilot, tool, mission, client] = await Promise.all([
      prisma.public_users.findUnique({ where: { user_id: event.fk_pilot_user_id }, select: { first_name: true, last_name: true } }),
      prisma.tool.findUnique({ where: { tool_id: event.fk_tool_id }, select: { tool_name: true, tool_code: true } }),
      event.fk_mission_id
        ? prisma.pilot_mission.findUnique({ where: { pilot_mission_id: event.fk_mission_id }, select: { mission_name: true, mission_code: true } })
        : null,
      event.fk_client_id ? prisma.client.findUnique({ where: { client_id: event.fk_client_id }, select: { client_name: true } }) : null,
    ]);

    const label = EVENT_TYPE_LABELS[event.event_type as EventType] ?? event.event_type;
    const lines = [
      `Event: ${label}`,
      `Reported: ${event.created_at.toISOString()}`,
      `Takeoff time: ${event.takeoff_time.toISOString()}`,
      `Pilot: ${[pilot?.first_name, pilot?.last_name].filter(Boolean).join(' ') || '—'}`,
      `Drone: ${tool ? `${tool.tool_name}${tool.tool_code ? ` (${tool.tool_code})` : ''}` : '—'}`,
      ...(client ? [`Client: ${client.client_name}`] : []),
      ...(mission ? [`Mission: ${mission.mission_name?.trim() || mission.mission_code?.trim() || `#${event.fk_mission_id}`}`] : []),
      ...(event.location_label ? [`Location: ${event.location_label}`] : []),
      ...(event.latitude != null && event.longitude != null ? [`Coordinates: ${Number(event.latitude)}, ${Number(event.longitude)}`] : []),
      ...(event.notes ? [`Notes: ${event.notes}`] : []),
    ];

    if (event.pilot_event_attachment.length > 0) {
      const links = await Promise.all(
        event.pilot_event_attachment.map(async (a) => {
          const url = await getPresignedDownloadUrl(a.file_key, ATTACHMENT_URL_TTL_S, a.file_name);
          return `${a.file_name}: ${url}`;
        }),
      );
      lines.push('', 'Attachments (links valid for 7 days):', ...links);
    }

    await sendNotificationEmail(recipients, `New event reported: ${label}`, lines.join('\n'), 'event_logbook');
    await incrementDailyEmailCount(event.fk_owner_id);
    console.log(`[event-email] event #${eventId}: email handed to mail provider for ${recipients.length} recipient(s)`);
  } catch (err) {
    console.error('[event-email] dispatch failed', err);
  }
}
