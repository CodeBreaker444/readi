import { prisma } from '@/lib/prisma';
import { logEvent } from '@/backend/services/auditLog/audit-log';

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

export async function updateOrgChartNode(
  ownerId: number,
  userId: number,
  position: string,
  parentUserId: number | null,
  actingUserId?: number,
  userName?: string,
  userEmail?: string,
  userRole?: string
): Promise<void> {
  await updateUserPosition(ownerId, userId, position);
  await upsertChartOverride({ owner_id: ownerId, user_id: userId, parent_user_id: parentUserId });

  const targetUser = await prisma.public_users.findUnique({
    where: { user_id: userId },
    select: { first_name: true, last_name: true },
  });
  const targetName = targetUser
    ? `${targetUser.first_name ?? ''} ${targetUser.last_name ?? ''}`.trim() || `User #${userId}`
    : `User #${userId}`;

  logEvent({
    eventType: 'UPDATE',
    entityType: 'org_chart_node',
    entityId: userId,
    description: `Org chart node updated for ${targetName}`,
    userId: actingUserId,
    userName: userName,
    userEmail: userEmail,
    userRole: userRole,
    ownerId: ownerId,
    metadata: { targetUserId: userId, position, parentUserId },
  });
}
