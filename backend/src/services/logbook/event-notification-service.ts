import 'server-only';

import { EVENT_TYPES, EVENT_TYPE_LABELS, type EventType } from '@/config/types/event-logbook';
import { prisma } from '@/lib/prisma';
import { getPresignedDownloadUrl } from '@/lib/s3Client';
import { z } from 'zod';
import { incrementDailyEmailCount, isDailyEmailLimitReached } from '../email/email-limit-service';
import { sendNotificationEmail } from '../../../../lib/resend/mail';
import { EventLogbookError } from './event-logbook-service';

const MAX_RECIPIENTS = 20;
const ATTACHMENT_URL_TTL_S = 7 * 24 * 60 * 60;

const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  company: z.string().trim().max(150).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  email: emailSchema,
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const emailNotificationInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  client_id: z.number().int().positive().nullable().optional(),
  event_types: z.array(z.enum(EVENT_TYPES)).default([]),
  recipient_emails: z.array(emailSchema).min(1).max(MAX_RECIPIENTS),
  is_active: z.boolean().optional(),
});
export type EmailNotificationInput = z.infer<typeof emailNotificationInputSchema>;

const unique = (emails: string[]) => [...new Set(emails)];
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

// ── Notification rules ───────────────────────────────────────────────────────

async function assertClientInOwner(ownerId: number, clientId: number | null | undefined) {
  if (!clientId) return;
  const client = await prisma.client.findFirst({ where: { client_id: clientId, fk_owner_id: ownerId }, select: { client_id: true } });
  if (!client) throw new EventLogbookError('Client not found', 404);
}

export async function listEmailNotifications(ownerId: number) {
  const rows = await prisma.event_email_notification.findMany({ where: { fk_owner_id: ownerId }, orderBy: { notification_id: 'asc' } });
  const clientIds = rows.map((r) => r.fk_client_id).filter((v): v is number => v != null);
  const clients = clientIds.length
    ? await prisma.client.findMany({ where: { client_id: { in: clientIds } }, select: { client_id: true, client_name: true } })
    : [];
  const names = new Map(clients.map((c) => [c.client_id, c.client_name]));
  return rows.map((r) => ({
    notification_id: r.notification_id,
    name: r.name,
    fk_client_id: r.fk_client_id,
    client_name: r.fk_client_id ? (names.get(r.fk_client_id) ?? null) : null,
    event_types: r.event_types,
    recipient_emails: r.recipient_emails,
    is_active: r.is_active,
  }));
}

export async function createEmailNotification(ownerId: number, userId: number, input: EmailNotificationInput) {
  await assertClientInOwner(ownerId, input.client_id);
  const row = await prisma.event_email_notification.create({
    data: {
      fk_owner_id: ownerId,
      fk_client_id: input.client_id ?? null,
      name: input.name,
      recipient_emails: unique(input.recipient_emails),
      event_types: input.event_types,
      is_active: input.is_active ?? true,
      created_by: userId,
    },
    select: { notification_id: true },
  });
  return row.notification_id;
}

async function getOwnedNotification(ownerId: number, id: number) {
  const row = await prisma.event_email_notification.findFirst({ where: { notification_id: id, fk_owner_id: ownerId } });
  if (!row) throw new EventLogbookError('Notification not found', 404);
  return row;
}

export async function updateEmailNotification(ownerId: number, id: number, input: Partial<EmailNotificationInput>) {
  await getOwnedNotification(ownerId, id);
  if (input.client_id !== undefined) await assertClientInOwner(ownerId, input.client_id);
  await prisma.event_email_notification.update({
    where: { notification_id: id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.client_id !== undefined ? { fk_client_id: input.client_id } : {}),
      ...(input.event_types !== undefined ? { event_types: input.event_types } : {}),
      ...(input.recipient_emails !== undefined ? { recipient_emails: unique(input.recipient_emails) } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      updated_at: new Date(),
    },
  });
}

export async function deleteEmailNotification(ownerId: number, id: number) {
  await getOwnedNotification(ownerId, id);
  await prisma.event_email_notification.delete({ where: { notification_id: id } });
}

export async function sendTestEmailNotification(ownerId: number, id: number) {
  const rule = await getOwnedNotification(ownerId, id);
  if (rule.recipient_emails.length === 0) throw new EventLogbookError('No recipients configured');
  if (await isDailyEmailLimitReached(ownerId)) throw new EventLogbookError('Daily email limit reached', 429);
  await sendNotificationEmail(
    rule.recipient_emails,
    'ReADI event notification — test',
    `This is a test email for the notification "${rule.name}". You will receive an email like this whenever a matching event is reported in the Event Logbook.`,
    'event_logbook_test',
  );
  await incrementDailyEmailCount(ownerId);
  return { sent_to: rule.recipient_emails.length };
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Emails the recipients of every active rule that matches the event's client and type.
 * Never throws: a mail failure must not affect the pilot's report.
 */
export async function dispatchEventEmails(eventId: number): Promise<void> {
  try {
    const event = await prisma.pilot_event.findUnique({ where: { event_id: eventId }, include: { pilot_event_attachment: true } });
    if (!event) return;

    const rules = await prisma.event_email_notification.findMany({
      where: {
        fk_owner_id: event.fk_owner_id,
        is_active: true,
        OR: [{ fk_client_id: null }, ...(event.fk_client_id ? [{ fk_client_id: event.fk_client_id }] : [])],
      },
    });
    const recipients = unique(
      rules.filter((r) => r.event_types.length === 0 || r.event_types.includes(event.event_type)).flatMap((r) => r.recipient_emails),
    );
    if (recipients.length === 0) {
      console.log(
        `[event-email] event #${eventId} (client ${event.fk_client_id ?? 'none'}, type ${event.event_type}): no matching notification — ${rules.length} active rule(s) for client scope`,
      );
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
