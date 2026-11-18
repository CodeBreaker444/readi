/**
 * Component / system side effects of closing a maintenance ticket:
 * reset counters, stamp last_maintenance_date, flip operational status.
 * Which components are affected is decided in maintenance-ticket-rules.ts.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isComponentExpired, isComponentPartOfSystem, isExpiryPermanent, parseComponentMeta } from './maintenance-rules';
import { computeEffectiveComponentStatus, getNonOperationalToolIds } from './system-service';

export async function setSystemOperationalStatus(toolId: number, status: string): Promise<void> {
  const tool = await prisma.tool.findUnique({
    where: { tool_id: toolId },
    select: { tool_metadata: true },
  });

  await prisma.tool.update({
    where: { tool_id: toolId },
    data: {
      tool_metadata: {
        ...(tool?.tool_metadata as Record<string, unknown> ?? {}),
        status,
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * A system that is Not Operational only because a component expired is put in Maintenance when a ticket is opened
 * for it, like an operator would do by hand. (Closing such a ticket requires the system to be in Maintenance, and
 * the list would otherwise keep showing Not Operational while work is under way.) A status the operator set
 * (Not Operational, Dismissed, ...) is left alone. Returns true when the system was switched.
 */
export async function putSystemInMaintenanceIfExpired(toolId: number): Promise<boolean> {
  const tool = await prisma.tool.findUnique({ where: { tool_id: toolId }, select: { tool_metadata: true } });
  const stored = (tool?.tool_metadata as Record<string, unknown> | null)?.status;
  if (stored && stored !== 'OPERATIONAL') return false;

  const nonOperational = await getNonOperationalToolIds([toolId]);
  if (!nonOperational.has(toolId)) return false;

  await setSystemOperationalStatus(toolId, 'MAINTENANCE');
  return true;
}

/** Components in one of these states can never be put on a ticket or flipped back to OPERATIONAL by one. */
const TICKET_BLOCKED_STATUSES = ['NOT_OPERATIONAL', 'DECOMMISSIONED', 'DISMISSED'];
const PERMANENT_BLOCKED_STATUSES = ['DECOMMISSIONED', 'DISMISSED'];

const EFFECTIVE_STATUS_SELECT = {
  component_id: true,
  component_metadata: true,
  expiration_date: true,
  expiry_type: true,
  expiration_flights: true,
  expiration_flight_hours: true,
  current_maintenance_flights: true,
  current_usage_hours: true,
} as const;

interface EffectiveRow {
  component_id: number;
  status: string;
  /**
   * Not Operational only because its renewable expiry was reached (not an explicit status, not a reported issue).
   * It can still go on a maintenance ticket: that is how it gets looked at before being renewed or decommissioned.
   */
  renewableExpired: boolean;
}

async function loadEffectiveRows(where: Prisma.tool_componentWhereInput): Promise<EffectiveRow[]> {
  const rows = await prisma.tool_component.findMany({ where, select: EFFECTIVE_STATUS_SELECT });
  return rows.map((row) => {
    const meta = parseComponentMeta(row.component_metadata);
    const status = meta.system_detached === true
      ? 'DISMISSED'
      : computeEffectiveComponentStatus({
          ...row,
          component_metadata: meta,
          expiration_date: row.expiration_date ?? null, // computeEffectiveComponentStatus normalises Date/invalid values
        });
    const renewableExpired =
      status === 'NOT_OPERATIONAL' &&
      !isExpiryPermanent(meta) &&
      meta.component_status !== 'NOT_OPERATIONAL' &&
      isComponentExpired({ ...row, expiration_date: row.expiration_date ?? null });
    return { component_id: row.component_id, status, renewableExpired };
  });
}

/** A status that keeps a component off a new ticket (an expired renewable component is the exception). */
const isTicketBlocked = (row: EffectiveRow) => TICKET_BLOCKED_STATUSES.includes(row.status) && !row.renewableExpired;

/** Status as shown in the component list: stored status, overridden by DISMISSED / expiry-based DECOMMISSIONED. */
async function loadEffectiveStatuses(where: Prisma.tool_componentWhereInput): Promise<Map<number, string>> {
  const rows = await loadEffectiveRows(where);
  return new Map(rows.map((r) => [r.component_id, r.status]));
}

/** Ids of the active components of a system that cannot be put on a new ticket. */
export async function getTicketBlockedComponentIds(toolId: number): Promise<Set<number>> {
  const rows = await loadEffectiveRows({ fk_tool_id: toolId, component_active: 'Y' });
  return new Set(rows.filter(isTicketBlocked).map((r) => r.component_id));
}

/** Effective status of every active component of a system, keyed by component id. */
export async function getComponentStatusesForTool(toolId: number): Promise<Map<number, string>> {
  return loadEffectiveStatuses({ fk_tool_id: toolId, component_active: 'Y' });
}

/** Components of the system that can go on a new ticket right now (operational and still attached). */
export async function getTicketableComponentIds(toolId: number): Promise<number[]> {
  const rows = await loadEffectiveRows({ fk_tool_id: toolId, component_active: 'Y' });
  return rows
    .filter((r) => !isTicketBlocked(r))
    .map((r) => r.component_id)
    .sort((a, b) => a - b);
}

/** Same as getComponentStatusesForTool for several systems at once. */
export async function getComponentStatusesForTools(toolIds: number[]): Promise<Map<number, string>> {
  if (!toolIds.length) return new Map();
  return loadEffectiveStatuses({ fk_tool_id: { in: toolIds }, component_active: 'Y' });
}

/** Components that stay on the dashboard / tickets as information only: they take no part in maintenance. */
export function isPermanentlyBlockedStatus(status: string | undefined): status is 'DECOMMISSIONED' | 'DISMISSED' {
  return PERMANENT_BLOCKED_STATUSES.includes(status ?? '');
}

/** Subset of `componentIds` that cannot be put on a ticket, with the status that blocks each. */
export async function findTicketBlockedComponents(
  toolId: number,
  componentIds: number[],
): Promise<{ component_id: number; status: string }[]> {
  if (!componentIds.length) return [];
  const rows = await loadEffectiveRows({ fk_tool_id: toolId, component_id: { in: componentIds } });
  return rows.filter(isTicketBlocked).map((r) => ({ component_id: r.component_id, status: r.status }));
}

export async function setComponentsOperationalStatus(componentIds: number[], status: string): Promise<void> {
  if (!componentIds.length) return;

  // Dismissed / decommissioned / expired components keep their status; a ticket cannot revive them.
  const effective = await loadEffectiveStatuses({ component_id: { in: componentIds } });
  const eligibleIds = componentIds.filter((id) => !PERMANENT_BLOCKED_STATUSES.includes(effective.get(id) ?? ''));
  if (!eligibleIds.length) return;

  const comps = await prisma.tool_component.findMany({
    where: { component_id: { in: eligibleIds } },
    select: { component_id: true, component_metadata: true },
  });

  await prisma.$transaction(
    comps.map((comp) =>
      prisma.tool_component.update({
        where: { component_id: comp.component_id },
        data: {
          component_metadata: {
            ...(comp.component_metadata as Record<string, unknown> ?? {}),
            component_status: status,
          } as Prisma.InputJsonValue,
        },
      })
    )
  );
}

/**
 * A component that expired (or was dismissed) while flagged MAINTENANCE keeps the stale flag, because a ticket
 * cannot revive it. Persist its real status so it stops holding the system in maintenance.
 */
export async function settleBlockedMaintenanceComponents(toolId: number): Promise<void> {
  const rows = await prisma.tool_component.findMany({
    where: { fk_tool_id: toolId, component_metadata: { path: ['component_status'], equals: 'MAINTENANCE' } },
    select: { ...EFFECTIVE_STATUS_SELECT },
  });

  for (const row of rows) {
    const meta = parseComponentMeta(row.component_metadata);
    const effective = meta.system_detached === true
      ? 'DISMISSED'
      : computeEffectiveComponentStatus({
          ...row,
          component_metadata: meta,
          expiration_date: row.expiration_date ?? null, // computeEffectiveComponentStatus normalises Date/invalid values
        });
    if (!PERMANENT_BLOCKED_STATUSES.includes(effective)) continue;

    await prisma.tool_component.update({
      where: { component_id: row.component_id },
      data: { component_metadata: { ...meta, component_status: effective } as Prisma.InputJsonValue },
    });
  }
}

/** Active components still attached to the system (detached / dismissed / decommissioned / expired ones are excluded). */
export async function getSystemComponentIds(toolId: number): Promise<number[]> {
  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
    },
    select: { component_id: true, component_metadata: true },
  });
  const effective = await getComponentStatusesForTool(toolId);

  return components
    .filter((c) => isComponentPartOfSystem(parseComponentMeta(c.component_metadata)))
    .filter((c) => !PERMANENT_BLOCKED_STATUSES.includes(effective.get(c.component_id) ?? ''))
    .map((c) => c.component_id);
}

/** Drops components that are dismissed / decommissioned / expired (e.g. ones named on tickets opened before this rule). */
export async function excludePermanentlyBlocked(toolId: number, componentIds: number[]): Promise<number[]> {
  if (!componentIds.length) return componentIds;
  const effective = await loadEffectiveStatuses({ fk_tool_id: toolId, component_id: { in: componentIds } });
  return componentIds.filter((id) => !PERMANENT_BLOCKED_STATUSES.includes(effective.get(id) ?? ''));
}

/**
 * A component named on a closed ticket has maintenance performed on it, so its last-maintenance
 * date is stamped and every maintenance counter restarts from zero, regardless of whether a
 * cycle type or limit was ever configured for it.
 */
export async function resetComponentCounters(
  toolId: number,
  resetAt: string,
  componentId?: number | null,
): Promise<void> {
  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
      ...(componentId ? { component_id: componentId } : {}),
    },
    select: { component_id: true },
  });

  if (!components.length) return;

  const updates = components.map((comp) =>
    prisma.tool_component.update({
      where: { component_id: comp.component_id },
      data: {
        last_maintenance_date: new Date(resetAt),
        current_maintenance_hours: 0,
        current_maintenance_flights: 0,
        current_maintenance_days: 0,
      },
    })
  );

  await prisma.$transaction(updates);
}
