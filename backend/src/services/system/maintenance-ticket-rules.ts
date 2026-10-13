/**
 * Maintenance ticket business rules (PURE - no database, no I/O).
 *
 *  - which components a ticket covers
 *  - whether a new ticket conflicts with open ones
 *  - which components get their counters reset when a ticket closes
 *  - ticket title / notification wording
 */

export interface TicketCoverage {
  fk_component_id: number | null;
  maintenance_ticket_item: { fk_component_id: number | null }[];
}

export const TICKET_CONFLICT_MESSAGE =
  'An open maintenance ticket already covers this system or the selected components. Close it first or select different components.';

export const SYSTEM_ALREADY_HAS_OPEN_TICKET_MESSAGE =
  'This system already has an open maintenance ticket. Close the existing ticket before reporting a new issue.';

export const SYSTEM_IN_MAINTENANCE_MESSAGE =
  'This system is currently in maintenance. Close the maintenance ticket before assigning it to an operation.';

/** Unique component ids a ticket points at (its primary component + its COMPONENT items). */
export function getTicketComponentIds(ticket: TicketCoverage): number[] {
  return [...new Set(
    [ticket.fk_component_id, ...ticket.maintenance_ticket_item.map((i) => i.fk_component_id)]
      .filter((id): id is number => id != null)
  )];
}

/** A ticket with no components is a system-level ticket: it covers every component of the system. */
export function isSystemLevelTicket(ticket: TicketCoverage): boolean {
  return ticket.fk_component_id == null && ticket.maintenance_ticket_item.length === 0;
}

/**
 * A new ticket is allowed while others are open as long as it targets specific components
 * that no open ticket already covers. System-level tickets (no components) cover everything,
 * so they conflict with any open ticket.
 */
export function hasTicketCoverageConflict(openTickets: TicketCoverage[], newComponentIds: number[]): boolean {
  if (!openTickets.length) return false;
  if (!newComponentIds.length) return true;

  const covered = new Set<number>();
  for (const ticket of openTickets) {
    const ids = getTicketComponentIds(ticket);
    if (!ids.length) return true; // open system-level ticket covers every component
    ids.forEach((id) => covered.add(id));
  }
  return newComponentIds.some((id) => covered.has(id));
}

/** Components named on the closing ticket(s). */
export function getTicketedComponentIds(tickets: TicketCoverage[]): number[] {
  return [...new Set(tickets.flatMap(getTicketComponentIds))];
}

export function hasSystemLevelTicket(tickets: TicketCoverage[]): boolean {
  return tickets.some(isSystemLevelTicket);
}

/**
 * Components whose counters restart when tickets close: the ones named on the ticket(s),
 * plus every system component when a system-level ticket closes.
 */
export function mergeResetComponentIds(ticketedIds: number[], systemComponentIds: number[]): number[] {
  return [...new Set([...ticketedIds, ...systemComponentIds])];
}

export function buildTicketTitle(toolId: number, componentIds: number[]): string {
  return componentIds.length
    ? `Component Maintenance - #${componentIds.join(', #')}`
    : `Maintenance - System #${toolId}`;
}

/**
 * Title used in the notification emails. NOTE: it only names the FIRST component, so for a
 * multi-component ticket it differs from the saved ticket_title (buildTicketTitle).
 */
export function buildTicketEmailTitle(toolId: number, rawComponents: number[] | undefined): string {
  return rawComponents?.length
    ? `Component Maintenance - #${rawComponents[0]}`
    : `Maintenance - System #${toolId}`;
}
