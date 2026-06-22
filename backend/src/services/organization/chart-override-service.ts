import { prisma } from '@/lib/prisma';

export interface ChartOverride {
  owner_id: number;
  user_id: number;
  parent_user_id: number | null; // null = direct child of company root
}

export async function getChartOverrides(ownerId: number): Promise<ChartOverride[]> {
  try {
    const rows = await prisma.org_chart_overrides.findMany({
      where: { owner_id: ownerId },
      select: { owner_id: true, user_id: true, parent_user_id: true },
    });
    return rows;
  } catch {
    return [];
  }
}

export async function upsertChartOverride(override: ChartOverride): Promise<void> {
  await prisma.org_chart_overrides.upsert({
    where: { owner_id_user_id: { owner_id: override.owner_id, user_id: override.user_id } },
    update: { parent_user_id: override.parent_user_id, updated_at: new Date() },
    create: { owner_id: override.owner_id, user_id: override.user_id, parent_user_id: override.parent_user_id },
  });
}

export async function updateUserPosition(ownerId: number, userId: number, position: string): Promise<void> {
  await prisma.user_owner.update({
    where: { fk_user_id_fk_owner_id: { fk_user_id: userId, fk_owner_id: ownerId } },
    data: { role_in_organization: position },
  });
}
