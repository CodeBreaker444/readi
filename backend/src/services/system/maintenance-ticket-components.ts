/**
 * Component / system side effects of closing a maintenance ticket:
 * reset counters, stamp last_maintenance_date, flip operational status.
 * Which components are affected is decided in maintenance-ticket-rules.ts.
 */
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { parseComponentMeta, isComponentPartOfSystem } from './maintenance-rules';

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

export async function setComponentsOperationalStatus(componentIds: number[], status: string): Promise<void> {
  if (!componentIds.length) return;
  const comps = await prisma.tool_component.findMany({
    where: { component_id: { in: componentIds } },
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

/** Active components still attached to the system (detached / decommissioned ones are excluded). */
export async function getSystemComponentIds(toolId: number): Promise<number[]> {
  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: toolId,
      component_active: 'Y',
    },
    select: { component_id: true, component_metadata: true },
  });

  return components
    .filter((c) => isComponentPartOfSystem(parseComponentMeta(c.component_metadata)))
    .map((c) => c.component_id);
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
