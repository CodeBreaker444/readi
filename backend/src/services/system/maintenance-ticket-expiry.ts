 
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { computeExpiryRenewal, type ExpiryRenewal } from '@/lib/system/expiry-renewal';
import { isExpiryPermanent, parseComponentMeta, toDayString } from './maintenance-rules';
import { excludePermanentlyBlocked, getSystemComponentIds } from './maintenance-ticket-components';
import { getTicketComponentIds, isSystemLevelTicket } from './maintenance-ticket-rules';

export interface ExpiryRenewalPlan {
  component_id: number;
  component_name: string | null;
  component_code: string | null;
  expiry_type: string;
  renewal: ExpiryRenewal;
}

/**
 * Which of these components would be renewed if their ticket closed now: non-permanent, still in the system,
 * and at an expiry limit. Call it BEFORE the counters are reset (the flight counter is part of the check).
 */
export async function planExpiryRenewals(componentIds: number[]): Promise<ExpiryRenewalPlan[]> {
  if (!componentIds.length) return [];
  const rows = await prisma.tool_component.findMany({
    where: { component_id: { in: componentIds }, component_active: 'Y' },
    select: {
      component_id: true,
      component_name: true,
      component_code: true,
      component_metadata: true,
      expiry_type: true,
      expiration_date: true,
      expiration_flights: true,
      expiration_flight_hours: true,
      current_maintenance_flights: true,
      current_usage_hours: true,
    },
    orderBy: { component_id: 'asc' },
  });

  const plans: ExpiryRenewalPlan[] = [];
  for (const row of rows) {
    const meta = parseComponentMeta(row.component_metadata);
    if (isExpiryPermanent(meta) || meta.system_detached === true || meta.component_status === 'DECOMMISSIONED' || meta.component_status === 'DISMISSED') continue;

    const renewal = computeExpiryRenewal({
      expiry_type: row.expiry_type,
      expiration_date: toDayString(row.expiration_date),
      expiration_flights: row.expiration_flights,
      expiration_flight_hours: row.expiration_flight_hours != null ? Number(row.expiration_flight_hours) : null,
      current_maintenance_flights: Number(row.current_maintenance_flights ?? 0),
      current_usage_hours: Number(row.current_usage_hours ?? 0),
    });
    if (renewal) {
      plans.push({
        component_id: row.component_id,
        component_name: row.component_name,
        component_code: row.component_code,
        expiry_type: row.expiry_type || 'EXPIRATION_DATE',
        renewal,
      });
    }
  }
  return plans;
}

/** Writes the new limits. Only the limits that were renewed are touched. */
export async function applyExpiryRenewals(plans: ExpiryRenewalPlan[]): Promise<void> {
  for (const { component_id, renewal } of plans) {
    const data: Prisma.tool_componentUpdateInput = {};
    if (renewal.expiration_date) data.expiration_date = new Date(renewal.expiration_date.to);
    if (renewal.expiration_flights) data.expiration_flights = renewal.expiration_flights.to;
    if (renewal.expiration_flight_hours) data.expiration_flight_hours = renewal.expiration_flight_hours.to;
    await prisma.tool_component.update({ where: { component_id }, data });
  }
}

/** What closing this ticket would renew, for the close dialog. Empty for a closed ticket or another owner's ticket. */
export async function getTicketExpiryRenewals(ticketId: number, ownerId: number): Promise<ExpiryRenewalPlan[]> {
  const ticket = await prisma.maintenance_ticket.findUnique({
    where: { ticket_id: ticketId },
    select: {
      fk_owner_id: true,
      fk_tool_id: true,
      fk_component_id: true,
      ticket_status: true,
      maintenance_ticket_item: {
        where: { item_type: 'COMPONENT', fk_component_id: { not: null } },
        select: { fk_component_id: true },
      },
    },
  });
  if (!ticket || ticket.fk_tool_id == null || ticket.ticket_status === 'CLOSED' || ticket.fk_owner_id !== ownerId) return [];

  // Same selection as closeTicket: the components named on the ticket, or every component of the system for a system-level ticket.
  const ids = isSystemLevelTicket(ticket) ? await getSystemComponentIds(ticket.fk_tool_id) : getTicketComponentIds(ticket);
  return planExpiryRenewals(await excludePermanentlyBlocked(ticket.fk_tool_id, ids));
}
