/**
 * Component / system side effects of closing a maintenance ticket:
 * reset counters, stamp last_maintenance_date, flip operational status.
 * Which components are affected is decided in maintenance-ticket-rules.ts.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { parseComponentMeta, isComponentPartOfSystem } from './maintenance-rules';
import { computeEffectiveComponentStatus } from './system-service';

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

/** Status as shown in the component list: stored status, overridden by DISMISSED / expiry-based DECOMMISSIONED. */
async function loadEffectiveStatuses(where: Prisma.tool_componentWhereInput): Promise<Map<number, string>> {
  const rows = await prisma.tool_component.findMany({ where, select: EFFECTIVE_STATUS_SELECT });
  const statuses = new Map<number, string>();
  for (const row of rows) {
    const meta = parseComponentMeta(row.component_metadata);
    const status = meta.system_detached === true
      ? 'DISMISSED'
      : computeEffectiveComponentStatus({
          ...row,
          component_metadata: meta,
          expiration_date: row.expiration_date ? new Date(row.expiration_date).toISOString().split('T')[0] : null,
        });
    statuses.set(row.component_id, status);
  }
  return statuses;
}

/** Effective status of every active component of a system, keyed by component id. */
export async function getComponentStatusesForTool(toolId: number): Promise<Map<number, string>> {
  return loadEffectiveStatuses({ fk_tool_id: toolId, component_active: 'Y' });
}

/** Components of the system that can go on a new ticket right now (operational and still attached). */
export async function getTicketableComponentIds(toolId: number): Promise<number[]> {
  const statuses = await getComponentStatusesForTool(toolId);
  return [...statuses.entries()]
    .filter(([, status]) => !TICKET_BLOCKED_STATUSES.includes(status))
    .map(([id]) => id)
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
  const statuses = await loadEffectiveStatuses({ fk_tool_id: toolId, component_id: { in: componentIds } });
  return [...statuses.entries()]
    .filter(([, status]) => TICKET_BLOCKED_STATUSES.includes(status))
    .map(([component_id, status]) => ({ component_id, status }));
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
          expiration_date: row.expiration_date ? new Date(row.expiration_date).toISOString().split('T')[0] : null,
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
