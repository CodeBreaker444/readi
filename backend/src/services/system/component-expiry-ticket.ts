/**
 * Expired components get a maintenance ticket automatically.
 *
 * When a component reaches an expiry limit (date, flights or flight hours) this module opens ONE maintenance
 * ticket for it and puts its system in Maintenance (instead of leaving it Not Operational). The component itself:
 *   - permanent expiry (default): reads as Decommissioned. The operator sets it to Decommissioned, removes it from
 *     the system or moves it to the warehouse.
 *   - renewable expiry (expiry_permanent === false): reads as Not Operational. The operator renews the limits (it is
 *     operational again) or sets it to Decommissioned.
 *
 * Idempotent: it is called from the expiry cron, right after a component is added / edited, and right after a
 * mission advances the flight / flight-hour counters, so it must never open two tickets for the same expiry.
 *   - `expiry_ticket_key` (stored on the component) identifies the expiry episode: the limits plus the last
 *     maintenance date. Renewing the limits, or closing a ticket (which resets counters), starts a new episode.
 *   - The component row is locked for the duration, so two concurrent runs serialize and the second one sees the key.
 *   - An already-open ticket that covers the component (or is a system-level ticket) counts as the ticket for this expiry.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { CreateTicketPayload } from '@/config/types/maintenance';
import {
  isComponentExpired,
  isComponentPartOfSystem,
  isExpiryPermanent,
  parseComponentMeta,
  toDayString,
} from './maintenance-rules';
import { putSystemInMaintenanceIfExpired } from './maintenance-ticket-components';
import { notifyTicketCreated } from './maintenance-ticket-notifications';
import { buildTicketTitle, hasTicketCoverageConflict } from './maintenance-ticket-rules';

export const EXPIRY_TICKET_REPORTER = 'System (component expiry)';

interface EpisodeInput {
  expiry_type: string | null;
  expiration_date: Date | string | null;
  expiration_flights: number | null;
  expiration_flight_hours: { toString(): string } | number | null;
  last_maintenance_date: Date | null;
}

/** Identifies one expiry episode of a component. Changes when its limits are renewed or maintenance is performed. */
export function buildExpiryEpisodeKey(c: EpisodeInput): string {
  return [
    c.expiry_type ?? 'EXPIRATION_DATE',
    toDayString(c.expiration_date) ?? '-',
    c.expiration_flights ?? '-',
    c.expiration_flight_hours != null ? Number(c.expiration_flight_hours) : '-',
    c.last_maintenance_date ? c.last_maintenance_date.toISOString() : '-',
  ].join('|');
}

function describeLimits(c: { expiry_type: string | null; expiration_date: Date | string | null; expiration_flights: number | null; expiration_flight_hours: { toString(): string } | number | null }): string {
  const type = c.expiry_type ?? 'EXPIRATION_DATE';
  const parts: string[] = [];
  const day = toDayString(c.expiration_date);
  if ((type === 'EXPIRATION_DATE' || type === 'MIXED') && day) parts.push(`expiry date ${day}`);
  if ((type === 'FLIGHTS' || type === 'MIXED') && c.expiration_flights != null) parts.push(`${c.expiration_flights} flights`);
  if ((type === 'FLIGHT_HOURS' || type === 'MIXED') && c.expiration_flight_hours != null) parts.push(`${Number(c.expiration_flight_hours)} flight hours`);
  return parts.join(', ') || 'its expiry limit';
}

/** Opens the expiry ticket for one component when it needs one. Returns the new ticket id, or null when nothing was opened. */
export async function raiseExpiryTicket(componentId: number): Promise<number | null> {
  const created = await prisma.$transaction(async (tx) => {
    // Serialize concurrent runs (cron + an edit) on this component.
    await tx.$queryRaw`SELECT component_id FROM public.tool_component WHERE component_id = ${componentId} FOR UPDATE`;

    const comp = await tx.tool_component.findUnique({
      where: { component_id: componentId },
      select: {
        component_id: true,
        component_name: true,
        component_code: true,
        component_type: true,
        component_active: true,
        component_metadata: true,
        fk_tool_id: true,
        expiry_type: true,
        expiration_date: true,
        expiration_flights: true,
        expiration_flight_hours: true,
        current_maintenance_flights: true,
        current_usage_hours: true,
        last_maintenance_date: true,
        tool: { select: { tool_active: true, fk_owner_id: true } },
      },
    });
    if (!comp || comp.component_active !== 'Y' || comp.fk_tool_id == null || comp.tool?.tool_active !== 'Y') return null;

    const meta = parseComponentMeta(comp.component_metadata);
    const permanent = isExpiryPermanent(meta);
    // Decommissioned, dismissed or warehouse components are out of the system: nothing to maintain.
    if (!isComponentPartOfSystem(meta) || meta.component_status === 'DISMISSED') return null;
    if (!isComponentExpired(comp)) return null;

    const key = buildExpiryEpisodeKey(comp);
    if (meta.expiry_ticket_key === key) return null;

    const stampKey = () =>
      tx.tool_component.update({
        where: { component_id: componentId },
        data: { component_metadata: { ...meta, expiry_ticket_key: key } as Prisma.InputJsonValue },
      });

    const openTickets = await tx.maintenance_ticket.findMany({
      where: { fk_tool_id: comp.fk_tool_id, ticket_status: { not: 'CLOSED' } },
      select: {
        fk_component_id: true,
        maintenance_ticket_item: {
          where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
          select: { fk_component_id: true },
        },
      },
    });
    if (hasTicketCoverageConflict(openTickets, [componentId])) {
      // An open ticket already covers this component: it is the ticket for this expiry.
      await stampKey();
      return null;
    }

    const label = comp.component_code || comp.component_name || comp.component_type || `#${componentId}`;
    const note = permanent
      ? `Component "${label}" reached its expiry limit (${describeLimits(comp)}) and is now Decommissioned (expiry is permanent). ` +
        'Set it to Decommissioned, remove it from the system, or move it to the warehouse.'
      : `Component "${label}" reached its expiry limit (${describeLimits(comp)}) and is now Not Operational. ` +
        'Renew its expiry limits to make it operational again, or set it to Decommissioned.';

    const ticket = await tx.maintenance_ticket.create({
      data: {
        fk_owner_id: comp.tool.fk_owner_id,
        fk_tool_id: comp.fk_tool_id,
        fk_component_id: componentId,
        ticket_title: buildTicketTitle(comp.fk_tool_id, [componentId]),
        ticket_type: 'STANDARD',
        ticket_priority: 'HIGH',
        ticket_status: 'OPEN',
        reported_by_user_id: null,
        resolution_notes: note,
        reported_at: new Date(),
        maintenance_ticket_item: {
          create: [{ fk_component_id: componentId, item_description: `Component #${componentId}`, item_type: 'COMPONENT' }],
        },
        maintenance_ticket_event: {
          create: [{
            event_type: 'CREATED',
            event_description: `Reported by ${EXPIRY_TICKET_REPORTER}: ${note}`,
            event_data: Prisma.JsonNull,
            created_at: new Date(),
          }],
        },
      },
      select: { ticket_id: true },
    });
    await stampKey();

    return { ticketId: ticket.ticket_id, ownerId: comp.tool.fk_owner_id, toolId: comp.fk_tool_id, note };
  });

  if (!created) return null;

  // Outside the transaction: neither of these may undo the ticket.
  // The expired component would keep its system Not Operational; with a ticket open it is in Maintenance.
  try {
    await putSystemInMaintenanceIfExpired(created.toolId);
  } catch (err) {
    console.error(`[ExpiryTicket] Could not set system ${created.toolId} to Maintenance:`, err);
  }

  const payload: CreateTicketPayload = {
    fk_owner_id: created.ownerId,
    fk_tool_id: created.toolId,
    components: [componentId],
    type: 'STANDARD',
    priority: 'HIGH',
    opened_by: EXPIRY_TICKET_REPORTER,
    fk_user_id: 0,
    reporter_name: EXPIRY_TICKET_REPORTER,
    note: created.note,
  };
  await notifyTicketCreated(payload, created.ticketId, EXPIRY_TICKET_REPORTER).catch(() => {});

  return created.ticketId;
}

/**
 * Closing a ticket performs maintenance (counters and last-maintenance date reset), which starts a new expiry episode.
 * A component that is STILL expired at that point was closed knowingly without renewing, so that episode is
 * marked as handled; otherwise the next cron run would open a second ticket for the same expiry.
 * It gets a fresh ticket only when its limits change or maintenance is performed again.
 */
export async function acknowledgeExpiryEpisodes(componentIds: number[]): Promise<void> {
  for (const componentId of new Set(componentIds)) {
    try {
      const comp = await prisma.tool_component.findUnique({
        where: { component_id: componentId },
        select: {
          component_metadata: true,
          expiry_type: true,
          expiration_date: true,
          expiration_flights: true,
          expiration_flight_hours: true,
          current_maintenance_flights: true,
          current_usage_hours: true,
          last_maintenance_date: true,
        },
      });
      if (!comp) continue;
      const meta = parseComponentMeta(comp.component_metadata);
      if (!isComponentExpired(comp)) continue;
      const key = buildExpiryEpisodeKey(comp);
      if (meta.expiry_ticket_key === key) continue;
      await prisma.tool_component.update({
        where: { component_id: componentId },
        data: { component_metadata: { ...meta, expiry_ticket_key: key } as Prisma.InputJsonValue },
      });
    } catch (err) {
      console.error(`[ExpiryTicket] Failed to acknowledge expiry for component ${componentId}:`, err);
    }
  }
}

/** Same as raiseExpiryTicket but never throws: used after a component save, which must not fail because of the ticket. */
export async function raiseExpiryTicketSafely(componentId: number): Promise<void> {
  try {
    await raiseExpiryTicket(componentId);
  } catch (err) {
    console.error(`[ExpiryTicket] Failed to raise expiry ticket for component ${componentId}:`, err);
  }
}

/** Several components at once (e.g. after a mission advanced their counters). Never throws. */
export async function raiseExpiryTicketsSafely(componentIds: number[]): Promise<void> {
  for (const id of new Set(componentIds)) await raiseExpiryTicketSafely(id);
}

/** Cron entry point: every active component that has reached an expiry limit gets its ticket. */
export async function runExpiryTicketSweep(): Promise<{ checked: number; created: number; errors: number }> {
  const endOfToday = new Date();
  endOfToday.setUTCHours(23, 59, 59, 999);
  const candidates = await prisma.tool_component.findMany({
    where: {
      component_active: 'Y',
      tool: { tool_active: 'Y' },
      // Only components with some expiry limit set; the exact check (per expiry type) is done below.
      OR: [
        { expiration_date: { lte: endOfToday } },
        { expiration_flights: { not: null } },
        { expiration_flight_hours: { not: null } },
      ],
    },
    select: {
      component_id: true,
      expiry_type: true,
      expiration_date: true,
      expiration_flights: true,
      expiration_flight_hours: true,
      current_maintenance_flights: true,
      current_usage_hours: true,
    },
  });

  const expired = candidates.filter((c) => isComponentExpired(c));
  let created = 0;
  let errors = 0;
  for (const c of expired) {
    try {
      if ((await raiseExpiryTicket(c.component_id)) !== null) created++;
    } catch (err) {
      errors++;
      console.error(`[ExpiryTicket] Failed for component ${c.component_id}:`, err);
    }
  }
  return { checked: expired.length, created, errors };
}
