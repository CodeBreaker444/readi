import { prisma } from '@/lib/prisma';

/**
 *
 * Call BEFORE any read/write on tool_component to update maintenance days.
 *
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

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const updates: { id: number; days: number }[] = [];

  for (const comp of components) {
    const limit = Number(comp.maintenance_cycle_day);
    const current = Number(comp.current_maintenance_days ?? 0);

    if (current >= limit) continue;

    const refDate = comp.last_maintenance_date ?? comp.installation_date;
    if (!refDate) continue;

    const lastStamp = new Date(refDate);
    lastStamp.setUTCHours(0, 0, 0, 0);

    const daysPassed = Math.floor((today.getTime() - lastStamp.getTime()) / 86_400_000);

    if (daysPassed <= 0) continue;

    const newValue = Math.min(daysPassed, limit);
    if (newValue === current) continue;

    updates.push({ id: comp.component_id, days: newValue });
  }

  if (updates.length === 0) return;

  await prisma.$transaction(
    updates.map((upd) =>
      prisma.tool_component.update({
        where: { component_id: upd.id },
        data: { current_maintenance_days: upd.days },
      })
    ),
    { timeout: 30000 } // 30 seconds
  );
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
