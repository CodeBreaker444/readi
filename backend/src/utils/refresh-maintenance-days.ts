import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { computeMaintenanceDayUpdates } from '@/backend/services/system/maintenance-rules';

/**
 * Call BEFORE any read/write on tool_component to update maintenance days.
 * The calculation lives in maintenance-rules.ts (computeMaintenanceDayUpdates);
 * this function only loads the components and writes the result.
 */
export async function refreshMaintenanceDays(toolIds: number[]): Promise<void> {
  if (toolIds.length === 0) return;

  const components = await prisma.tool_component.findMany({
    where: {
      fk_tool_id: { in: toolIds },
      component_active: 'Y',
      maintenance_cycle: { in: ['DAYS', 'MIXED'] },
      maintenance_cycle_day: { gt: 0 },
    },
    select: {
      component_id: true,
      maintenance_cycle_day: true,
      current_maintenance_days: true,
      last_maintenance_date: true,
      installation_date: true,
    },
  });

  if (components.length === 0) return;

  const updates = computeMaintenanceDayUpdates(components, new Date());

  if (updates.length === 0) return;

  // Single statement bulk UPDATE instead of N sequential updates inside a transaction
  await prisma.$executeRaw`
    UPDATE tool_component AS tc
    SET current_maintenance_days = v.days
    FROM (VALUES ${Prisma.join(
      updates.map((u) => Prisma.sql`(${u.id}::int, ${u.days}::int)`),
    )}) AS v(component_id, days)
    WHERE tc.component_id = v.component_id
  `;
}

export async function refreshMaintenanceDaysForTool(toolId: number): Promise<void> {
  return refreshMaintenanceDays([toolId]);
}

export async function refreshMaintenanceDaysForOwner(ownerId: number): Promise<void> {
  const tools = await prisma.tool.findMany({
    where: { fk_owner_id: ownerId, tool_active: 'Y' },
    select: { tool_id: true },
  });

  if (tools.length === 0) return;
  return refreshMaintenanceDays(tools.map((t) => t.tool_id));
}
